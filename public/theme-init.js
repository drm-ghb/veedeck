(function(){try{
  var t=localStorage.getItem('veedeck-theme');
  if(t==='dark')document.documentElement.classList.add('dark');
  var c=localStorage.getItem('color-theme');
  if(c)document.documentElement.dataset.theme=c;
}catch(e){}})();
