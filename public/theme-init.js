'use strict';
(()=>{
 let theme='christmas';
 try{
  const saved=JSON.parse(localStorage.getItem('camicat-prototype-v1-seasonal-theme'));
  if(['christmas','forest','light'].includes(saved))theme=saved;
 }catch{}
 document.documentElement.dataset.jewelScene=theme;
 document.querySelector('meta[name="theme-color"]').content={christmas:'#722d3b',forest:'#adbea2',light:'#f5f1e8'}[theme];
})();
