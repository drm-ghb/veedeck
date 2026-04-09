"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ExternalLink, MessageSquare, Check, X, RotateCcw } from "lucide-react";
import ProductCommentPanel from "./ProductCommentPanel";
import { pusherClient } from "@/lib/pusher";

import { getUnreadSet, syncListUnread } from "@/lib/list-unread-store";

function parsePrice(price: string | null): number | null {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^\d.,]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function getCurrency(price: string | null): string {
  if (!price) return "";
  return price.replace(/[\d.,\s]/g, "").trim();
}

interface Product {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  price: string | null;
  manufacturer: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
  deliveryTime: string | null;
  quantity: number;
  order: number;
  commentCount: number;
  approval: string | null;
}

interface Section {
  id: string;
  name: string;
  order: number;
  products: Product[];
}

interface ShareListClientProps {
  listId: string;
  listShareToken: string;
  listName: string;
  projectTitle?: string;
  projectShareToken?: string;
  sections: Section[];
  grandTotal: number;
  grandCurrency: string;
  hasTotal: boolean;
  designerName?: string;
  designerLogoUrl?: string;
}

export default function ShareListClient({
  listId,
  listShareToken,
  listName,
  projectTitle,
  projectShareToken,
  sections,
  grandTotal,
  grandCurrency,
  hasTotal,
  designerName,
  designerLogoUrl,
}: ShareListClientProps) {
  const [commentsPanelProductId, setCommentsPanelProductId] = useState<string | null>(null);
  const [panelLastReadAt, setPanelLastReadAt] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const s of sections) {
      for (const p of s.products) {
        init[p.id] = p.approval ?? null;
      }
    }
    return init;
  });
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of sections) {
      for (const p of s.products) {
        init[p.id] = p.commentCount;
      }
    }
    return init;
  });
  const [unreadProducts, setUnreadProducts] = useState<Set<string>>(() => new Set(getUnreadSet(listId)));
  const [authorName, setAuthorName] = useState("Klient");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const commentsPanelProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    commentsPanelProductIdRef.current = commentsPanelProductId;
  }, [commentsPanelProductId]);

  useEffect(() => {
    const stored = localStorage.getItem(`renderflow-author-${listShareToken}`);
    if (stored) setAuthorName(stored);
    // Initialize unread set from localStorage + module-level store
    const store = getUnreadSet(listId);
    const unread = new Set<string>(store);
    for (const s of sections) {
      for (const p of s.products) {
        if (localStorage.getItem(`lc_unread_${p.id}`) === "1") {
          unread.add(p.id);
          store.add(p.id);
          continue;
        }
        const val = localStorage.getItem(`lc_seen_${p.id}`);
        if (val === null) {
          localStorage.setItem(`lc_seen_${p.id}`, String(p.commentCount));
        } else if (p.commentCount > parseInt(val)) {
          unread.add(p.id);
          store.add(p.id);
          localStorage.setItem(`lc_unread_${p.id}`, "1");
        }
      }
    }
    setUnreadProducts(new Set(unread));
    syncListUnread(listId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time badge updates via list-level Pusher channel
  useEffect(() => {
    const channel = pusherClient.subscribe(`shopping-list-${listId}`);
    channel.bind("comment-activity", ({ productId, action }: { productId: string; action: string }) => {
      if (commentsPanelProductIdRef.current === productId) return; // panel handles it
      setCommentCounts((prev) => ({
        ...prev,
        [productId]: action === "new" ? (prev[productId] ?? 0) + 1 : Math.max(0, (prev[productId] ?? 0) - 1),
      }));
      if (action === "new") {
        localStorage.setItem(`lc_unread_${productId}`, "1");
        getUnreadSet(listId).add(productId);
        syncListUnread(listId);
        setUnreadProducts((prev) => new Set([...prev, productId]));
      }
    });
    channel.bind("approval-change", ({ productId, approval }: { productId: string; approval: string | null }) => {
      setApprovals((prev) => ({ ...prev, [productId]: approval }));
    });
    return () => {
      channel.unbind("comment-activity");
      channel.unbind("approval-change");
      pusherClient.unsubscribe(`shopping-list-${listId}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  async function handleApproval(productId: string, value: "accepted" | "rejected" | null) {
    const prevApproval = approvals[productId];
    setApprovals((prev) => ({ ...prev, [productId]: value }));
    try {
      const res = await fetch(`/api/share/list/${listShareToken}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval: value, clientName: authorName }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setApprovals((prev) => ({ ...prev, [productId]: prevApproval }));
    }
  }

  const handleCountChange = useCallback((productId: string, count: number) => {
    setCommentCounts((prev) => ({ ...prev, [productId]: count }));
  }, []);

  function openCommentsPanel(productId: string) {
    const lastReadAt = localStorage.getItem(`lc_readAt_${productId}`);
    localStorage.setItem(`lc_readAt_${productId}`, new Date().toISOString());
    localStorage.removeItem(`lc_unread_${productId}`);
    getUnreadSet(listId).delete(productId);
    syncListUnread(listId);
    setUnreadProducts((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    setPanelLastReadAt(lastReadAt);
    setCommentsPanelProductId(productId);
  }

  function closeCommentsPanel() {
    if (commentsPanelProductId) {
      const currentCount = commentCounts[commentsPanelProductId] ?? 0;
      localStorage.setItem(`lc_seen_${commentsPanelProductId}`, String(currentCount));
    }
    setCommentsPanelProductId(null);
  }

  const homeHref = projectShareToken ? `/share/${projectShareToken}/home` : undefined;

  return (
    <div className="space-y-10">
      {sections.length === 0 && (
        <p className="text-center text-muted-foreground py-16">Lista jest pusta.</p>
      )}

      {sections.map((section) => (
        <div key={section.id}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{section.name}</h2>
              {section.products.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                  {section.products.length}
                </span>
              )}
            </div>
            {(() => {
              let total = 0; let cur = ""; let has = false;
              for (const p of section.products) { const n = parsePrice(p.price); if (n !== null) { total += n * p.quantity; if (!cur) cur = getCurrency(p.price); has = true; } }
              return has ? <span className="text-sm font-semibold">{total.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {cur}</span> : null;
            })()}
          </div>

          {section.products.length === 0 ? (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-6 text-center">
              Brak produktów w tej sekcji
            </p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {section.products.map((product, i) => {
                const unitPrice = parsePrice(product.price);
                const currency = getCurrency(product.price);
                const totalPrice = unitPrice !== null ? unitPrice * product.quantity : null;
                const last = i === section.products.length - 1;
                const count = commentCounts[product.id] ?? product.commentCount;

                const unread = unreadProducts.has(product.id);
                const approval = approvals[product.id] ?? null;
                const approvalButtons = (
                  <>
                    <button
                      onClick={() => handleApproval(product.id, approval === "accepted" ? null : "accepted")}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${approval === "accepted" ? "bg-green-500 text-white" : "text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"}`}
                      title={approval === "accepted" ? "Cofnij akceptację" : "Zaakceptuj"}
                    ><Check size={14} /></button>
                    <button
                      onClick={() => handleApproval(product.id, approval === "rejected" ? null : "rejected")}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${approval === "rejected" ? "bg-red-500 text-white" : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"}`}
                      title={approval === "rejected" ? "Cofnij odrzucenie" : "Odrzuć"}
                    ><X size={14} /></button>
                  </>
                );
                const commentBtn = (size: number) => (
                  <button onClick={() => openCommentsPanel(product.id)} className="relative flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Komentarze">
                    <MessageSquare size={size} className={unread ? "text-blue-500" : ""} />
                    {count > 0 && <span className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none ${unread ? "bg-blue-500" : "bg-muted-foreground/40"}`}>{count > 99 ? "99+" : count}</span>}
                  </button>
                );
                return (
                  <div key={product.id} className={!last ? "border-b border-border" : ""}>
                    {/* ── DESKTOP (md+) ── */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-4 hover:bg-muted/30 transition-colors">
                      <div className="w-32 h-32 shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-3xl text-muted-foreground/30 select-none">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          {approval === "accepted" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">Zaakceptowane</span>}
                          {approval === "rejected" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">Odrzucone</span>}
                        </div>
                        {product.manufacturer && <p className="text-xs text-muted-foreground mt-0.5">{product.manufacturer}</p>}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          {product.color && <span className="text-xs text-muted-foreground">Kolor: {product.color}</span>}
                          {product.dimensions && <span className="text-xs text-muted-foreground">Wymiar: {product.dimensions}</span>}
                          {product.deliveryTime && <span className="text-xs text-muted-foreground">Dostawa: {product.deliveryTime}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Szt.:</span>
                          <span className="text-sm font-medium tabular-nums">{product.quantity}</span>
                        </div>
                        {totalPrice !== null && (
                          <div className="text-right min-w-[72px]">
                            <p className="text-sm font-semibold tabular-nums">{totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}</p>
                            {product.quantity > 1 && unitPrice !== null && <p className="text-xs text-muted-foreground tabular-nums">{unitPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / szt.</p>}
                          </div>
                        )}
                        {product.url ? <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><ExternalLink size={13} /></a> : <span className="w-4" />}
                        {approvalButtons}
                        {commentBtn(14)}
                      </div>
                    </div>

                    {/* ── MOBILE (< md) ── */}
                    <div className="md:hidden flex items-start gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain cursor-pointer" onClick={() => setLightbox(product.imageUrl!)} />
                        ) : (
                          <span className="text-xl text-muted-foreground/30">📦</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + actions */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground leading-tight truncate">{product.name}</p>
                            {product.manufacturer && <p className="text-xs text-muted-foreground truncate">{product.manufacturer}</p>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
                            {approvalButtons}
                          </div>
                        </div>
                        {/* Row 2: price + approval badge */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {totalPrice !== null && <span className="text-sm font-semibold text-foreground tabular-nums">{totalPrice.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {currency}</span>}
                          {approval === "accepted" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Zaakceptowane</span>}
                          {approval === "rejected" && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Odrzucone</span>}
                        </div>
                        {/* Row 3: qty + link | comments */}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Szt.: <span className="font-medium text-foreground">{product.quantity}</span></span>
                            {product.url && <a href={product.url} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ExternalLink size={13} /></a>}
                          </div>
                          {commentBtn(14)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {commentsPanelProductId && (() => {
        const product = sections.flatMap((s) => s.products).find((p) => p.id === commentsPanelProductId);
        return product ? (
          <ProductCommentPanel
            productId={commentsPanelProductId}
            productName={product.name}
            isDesigner={false}
            authorName={authorName}
            designerName={designerName}
            designerLogoUrl={designerLogoUrl}
            lastReadAt={panelLastReadAt}
            onClose={closeCommentsPanel}
            onCountChange={handleCountChange}
          />
        ) : null;
      })()}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2"><X size={20} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
