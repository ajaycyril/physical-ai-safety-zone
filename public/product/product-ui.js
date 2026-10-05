const get=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
function digest(){for(const[source,target]of[['#selectedLayer','[data-digest-title]'],['#selectedInput','[data-digest-input]'],['#selectedOutput','[data-digest-output]']]){const a=get(source),b=get(target);if(a&&b&&b.textContent!==a.textContent)b.textContent=a.textContent;}}
if(get('#selectedLayer'))new MutationObserver(digest).observe(get('.contract-strip'),{subtree:true,childList:true,characterData:true});digest();
// No view switching runs a physical action. Interaction only selects an explanation/model.
all('.launch-card canvas').forEach(c=>c.addEventListener('click',e=>e.preventDefault()));
