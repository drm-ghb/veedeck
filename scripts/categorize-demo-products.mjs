import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("./src/lib/demo-products-data.json", "utf8"));

const MEBLE = new Set([
  0,1,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,
  36,37,38,39,40,41,42,43,44,45,46,47,48,49,
  59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,
  79,80,81,82,83,85,86,87,88,89,90,
  107,108,109,110,111,112,113,114,115,116,117,118,119,120,
  123,124,125,138,146,147,153,154,155,
  159,160,161,162,167,168,169,172,
  201,203,208,210,211,217,218,
  242,243,244,245,247,248,249,269,
]);

const OSWIETLENIE = new Set([
  2,4,23,24,25,26,27,28,29,30,31,32,
  50,51,52,53,54,55,56,57,
  91,92,93,94,95,96,97,
  104,105,106,121,122,151,156,157,
  165,166,173,174,175,183,189,193,
  202,207,212,213,214,216,222,
  233,234,235,236,237,238,239,240,241,255,259,
]);

const ARMATURA = new Set([
  76,77,78,133,134,135,152,158,
  176,177,178,179,180,182,
  185,186,187,188,194,195,197,199,200,
  223,224,225,226,227,
  250,251,252,256,258,261,262,263,264,265,266,267,268,270,
]);

const OKLADZINY_SCIENNE = new Set([
  3,103,130,131,132,136,137,
  140,141,142,143,148,149,181,184,190,196,
  204,205,206,221,229,230,232,
  254,260,271,272,273,274,275,276,
]);

const PODLOGA = new Set([150, 191, 192, 215, 220, 231]);

const AKCESORIA = new Set([
  33,34,35,58,84,
  98,99,100,101,102,126,127,128,129,
  144,145,164,170,171,198,
  209,219,228,246,253,257,277,
]);

let counts = { MEBLE:0, OSWIETLENIE:0, ARMATURA:0, OKLADZINY_SCIENNE:0, PODLOGA:0, AKCESORIA:0, unchanged:0 };

data.forEach((p, i) => {
  if (MEBLE.has(i))             { p.category = "MEBLE";            counts.MEBLE++; }
  else if (OSWIETLENIE.has(i))  { p.category = "OSWIETLENIE";      counts.OSWIETLENIE++; }
  else if (ARMATURA.has(i))     { p.category = "ARMATURA";         counts.ARMATURA++; }
  else if (OKLADZINY_SCIENNE.has(i)) { p.category = "OKLADZINY_SCIENNE"; counts.OKLADZINY_SCIENNE++; }
  else if (PODLOGA.has(i))      { p.category = "PODLOGA";          counts.PODLOGA++; }
  else if (AKCESORIA.has(i))    { p.category = "AKCESORIA";        counts.AKCESORIA++; }
  else                          { counts.unchanged++; }
});

writeFileSync("./src/lib/demo-products-data.json", JSON.stringify(data, null, 2));
console.log("Done:", counts);
