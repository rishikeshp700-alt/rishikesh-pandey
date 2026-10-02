
const EDIT_KEY_PREFIX="rp-v8-edit:";
const IMG_KEY_PREFIX="rp-v8-img:";

let editMode=false;
const DB_NAME="RishikeshPandeySiteFilesV8", DB_STORE="files";
function dbOpen(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB_NAME,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE)};
  r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
 });
}
async function dbPut(key,blob){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(blob,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function dbGet(key){const db=await dbOpen();return new Promise((res,rej)=>{const r=db.transaction(DB_STORE).objectStore(DB_STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbDel(key){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).delete(key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
function canvasBlob(file,maxW=1280,maxH=1280,quality=.78){
 return new Promise((resolve,reject)=>{
  const fr=new FileReader(); fr.onerror=reject;
  fr.onload=()=>{const im=new Image(); im.onerror=reject; im.onload=()=>{
   let s=Math.min(maxW/im.width,maxH/im.height,1),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s));
   const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h);
   c.toBlob(b=>b?resolve(b):reject(new Error("Compression failed")),"image/jpeg",quality);
  };im.src=fr.result};fr.readAsDataURL(file);
 });
}

function fileName(){return location.pathname.split("/").pop()||"index.html"}
function pageKey(){return EDIT_KEY_PREFIX+fileName()}
function imgKey(img,i){return IMG_KEY_PREFIX+fileName()+":"+i}

function editableNodes(){
 return document.querySelectorAll("main h1,main h2,main h3,main h4,main p,main li,main .eyebrow,main .quote,main .card>span,main .contact-item span,main .contact-item b,main .file-icon,main small,footer span");
}
function setEditable(on){
 editMode=on; document.body.classList.toggle("editing",on);
 editableNodes().forEach(el=>{el.contentEditable=on?"true":"false";el.spellcheck=on});
 document.querySelectorAll("main img").forEach(img=>img.classList.toggle("image-editable",on));
 let b=document.getElementById("editToggle"); if(b)b.textContent=on?"Finish Editing":"Edit Page";
}
function savePage(){
 setEditable(false);
 let main=document.querySelector("main"); if(main){try{localStorage.setItem(pageKey(),main.innerHTML)}catch(e){alert("Text save storage is full. Use Reset once, then edit again.");return;} }
 toast("Page saved");
}
function resetPage(){
 if(confirm("Reset text and photos on this page?")){
   localStorage.removeItem(pageKey());
   localStorage.removeItem("rp-v6-reset-marker:"+fileName());
   indexedDB.deleteDatabase(DB_NAME);
   location.reload();
 }
}
function toast(msg){
 let t=document.createElement("div");t.className="edit-toast";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);
}
function toggleEditMode(){setEditable(!editMode)}

function installImageEditor(){
 document.querySelectorAll("main img").forEach(async(img,i)=>{
   const key="mainimg:"+fileName()+":"+i;
   const saved=await dbGet(key).catch(()=>null);
   if(saved) img.src=URL.createObjectURL(saved);
   img.dataset.editIndex=i;
   img.addEventListener("click",e=>{
     if(!editMode)return;
     e.preventDefault();e.stopPropagation();openImagePicker(img,i);
   });
 });
}
function openImagePicker(img,i){
 const input=document.createElement("input");input.type="file";input.accept="image/*";input.style.display="none";
 input.onchange=async()=>{
   const f=input.files&&input.files[0];if(!f)return;
   try{
    const blob=await canvasBlob(f,1400,1400,.78);
    await dbPut("mainimg:"+fileName()+":"+i,blob);
    img.src=URL.createObjectURL(blob);toast("Photo optimized & saved");
   }catch(e){alert("Photo could not be saved. Please try another image.");}
 };
 document.body.appendChild(input);input.click();setTimeout(()=>input.remove(),1000);
}
function toggleMenu(){let n=document.getElementById("nav");if(n)n.classList.toggle("open")}
document.addEventListener("DOMContentLoaded",()=>{
 let saved=localStorage.getItem(pageKey()),main=document.querySelector("main");
 if(saved&&main)main.innerHTML=saved;
 document.querySelectorAll("#year").forEach(x=>x.textContent=new Date().getFullYear());
 installImageEditor();
 let bar=document.createElement("div");bar.className="editor-bar";
 bar.innerHTML='<button id="editToggle" type="button">Edit Page</button><button class="save-edit" id="saveEdit" type="button">Save</button><button id="resetEdit" type="button">Reset</button>';
 bar.querySelector("#editToggle").addEventListener("click",toggleEditMode);
 bar.querySelector("#saveEdit").addEventListener("click",savePage);
 bar.querySelector("#resetEdit").addEventListener("click",resetPage);
 document.body.appendChild(bar);
});

function blobKey(el,i){return "media:"+fileName()+":"+i}
function linkKey(el,i){return "rp-v8-link:"+fileName()+":"+i}
async function installPortfolioEditor(){
 const media=document.querySelectorAll(".media-placeholder");
 media.forEach(async(box,i)=>{
   const saved=await dbGet(blobKey(box,i)).catch(()=>null);
   if(saved) box.innerHTML='<img src="'+URL.createObjectURL(saved)+'" alt="Portfolio image">';
   box.addEventListener("click",e=>{
     if(!editMode)return;e.preventDefault();e.stopPropagation();
     const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
     inp.onchange=async()=>{
       const f=inp.files&&inp.files[0];if(!f)return;
       try{
        const blob=await canvasBlob(f,1280,720,.76);
        await dbPut(blobKey(box,i),blob);
        box.innerHTML='<img src="'+URL.createObjectURL(blob)+'" alt="Portfolio image">';
        toast("Image optimized & saved");
       }catch(err){alert("Image could not be saved. Please try again.");}
     };inp.click();
   });
 });
 document.querySelectorAll(".project-link").forEach(async(a,i)=>{
   const url=localStorage.getItem(linkKey(a,i));if(url)a.href=url;
   const savedFile=await dbGet("doc:"+fileName()+":"+i).catch(()=>null);
   if(savedFile){a.href=URL.createObjectURL(savedFile);a.dataset.localFile="1";}
   a.addEventListener("click",async e=>{
     if(!editMode)return;e.preventDefault();e.stopPropagation();
     const type=prompt("Paste YouTube/web URL, or type FILE to attach PDF/PPT:");
     if(!type)return;
     if(type.trim().toUpperCase()==="FILE"){
       const inp=document.createElement("input");inp.type="file";inp.accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";
       inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;try{
         await dbPut("doc:"+fileName()+":"+i,f);a.href=URL.createObjectURL(f);a.dataset.localFile="1";localStorage.removeItem(linkKey(a,i));toast(f.name+" attached");
       }catch(err){alert("File could not be saved in this browser.");}};
       inp.click();
     }else{
       a.href=type.trim();a.dataset.localFile="";localStorage.setItem(linkKey(a,i),a.href);await dbDel("doc:"+fileName()+":"+i).catch(()=>{});toast("Link saved");
     }
   });
 });
}
document.addEventListener("DOMContentLoaded",installPortfolioEditor);

// v10 portfolio updater: keeps the user's browser-saved edits, but refreshes only sections 3, 4 and 6.
function applyBuiltInPortfolioUpdates(){
  if(fileName()!=="portfolio.html") return;
  const replacements = {"3.": "<section><div class=\"container\"><h2>3. Academic Projects &amp; Reports</h2>\n<p>Selected MBA academic work and presentations. Each item below opens the original uploaded file directly.</p>\n<div class=\"project-grid\">\n<article class=\"project-card file-card\"><div class=\"file-icon\">DOCX</div><h3>Summer Internship Project Report</h3><p>Data Science &amp; Analytics Applications and Learning Experience \u2014 Future Interns.</p><a class=\"btn project-link\" href=\"assets/projects/SIP_Data_Science_Analytics_Future_Interns.docx\" target=\"_blank\">Open SIP Report \u2192</a></article>\n<article class=\"project-card file-card\"><div class=\"file-icon\">PPTX</div><h3>SAP / ERP Project Presentation</h3><p>Small-Medium Enterprise (SME) using SAP tools in the automobile industry.</p><a class=\"btn project-link\" href=\"assets/projects/SAP_ERP_Project_Rishikesh_Pandey.pptx\">Open in PowerPoint \u2192</a></article>\n<article class=\"project-card file-card\"><div class=\"file-icon\">PDF</div><h3>Air India Strategic Transformation</h3><p>MBA strategic project covering transformation, operations, technology, finance, risk and change management.</p><a class=\"btn project-link\" href=\"assets/projects/Air_India_Strategic_Transformation_Project.pdf\" target=\"_blank\">Open Project Report \u2192</a></article>\n<article class=\"project-card file-card\"><div class=\"file-icon\">PDF</div><h3>UrbanClap / Urban Company Project</h3><p>Marketplace for on-demand services \u2014 connecting service providers with consumers.</p><a class=\"btn project-link\" href=\"assets/projects/UrbanClap_Project_Report.pdf\" target=\"_blank\">Open Project Report \u2192</a></article>\n</div></div></section>", "4.": "<section class=\"alt-section\"><div class=\"container\"><h2>4. Digital &amp; Creative Projects</h2>\n<p>A selection of thumbnail designs, visiting-card concepts, pamphlet designs, logo concepts and an engagement invitation video.</p>\n<h3 style=\"margin-top:28px\">YouTube Thumbnail Designs</h3><div class=\"creative-grid\">\n<article class=\"creative-card\"><img alt=\"MBA specialization thumbnail\" class=\"portfolio-media wide\" src=\"assets/portfolio/thumbnail-mba-specialization.png\"/><h3>MBA Specialization</h3><p>YouTube thumbnail design.</p></article>\n<article class=\"creative-card\"><img alt=\"Money is Everything thumbnail\" class=\"portfolio-media wide\" src=\"assets/portfolio/thumbnail-money-is-everything.png\"/><h3>Motivational / Finance Creative</h3><p>16:9 thumbnail concept.</p></article>\n<article class=\"creative-card\"><img alt=\"SIP report thumbnail\" class=\"portfolio-media wide\" src=\"assets/portfolio/thumbnail-sip-report.png\"/><h3>SIP Report</h3><p>Academic-content thumbnail.</p></article>\n<article class=\"creative-card\"><img alt=\"Dairy Milk factory thumbnail\" class=\"portfolio-media wide\" src=\"assets/portfolio/thumbnail-dairy-milk-factory.png\"/><h3>Dairy Milk Factory</h3><p>Documentary-style thumbnail design.</p></article>\n</div>\n<h3 style=\"margin-top:36px\">Visiting Card Designs</h3><div class=\"creative-grid\">\n<article class=\"creative-card\"><img alt=\"Visiting card design 1\" class=\"portfolio-media design\" src=\"assets/portfolio/visiting-card-1.png\"/><h3>Business Card Concept 01</h3></article>\n<article class=\"creative-card\"><img alt=\"Visiting card design 2\" class=\"portfolio-media design\" src=\"assets/portfolio/visiting-card-2.png\"/><h3>Business Card Concept 02</h3></article>\n<article class=\"creative-card\"><img alt=\"Visiting card design 3\" class=\"portfolio-media design\" src=\"assets/portfolio/visiting-card-3.png\"/><h3>Business Card Concept 03</h3></article>\n</div>\n<h3 style=\"margin-top:36px\">Pamphlet / Flyer Designs</h3><div class=\"creative-grid\">\n<article class=\"creative-card\"><img alt=\"Storage services pamphlet\" class=\"portfolio-media design\" src=\"assets/portfolio/pamphlet-1.png\"/><h3>Storage Services Flyer</h3></article>\n<article class=\"creative-card\"><img alt=\"Elderly care pamphlet\" class=\"portfolio-media design\" src=\"assets/portfolio/pamphlet-2.png\"/><h3>Elderly Home Care Flyer</h3></article>\n<article class=\"creative-card\"><img alt=\"Construction brochure\" class=\"portfolio-media design\" src=\"assets/portfolio/pamphlet-3.png\"/><h3>Construction Company Brochure</h3></article>\n</div>\n<h3 style=\"margin-top:36px\">Logo Concepts</h3><div class=\"creative-grid\">\n<article class=\"creative-card\"><img alt=\"Lavana logo\" class=\"portfolio-media design\" src=\"assets/portfolio/logo-lavana.png\"/><h3>Lavana Fashion Store</h3></article>\n<article class=\"creative-card\"><img alt=\"Preloved logo\" class=\"portfolio-media design\" src=\"assets/portfolio/logo-preloved.png\"/><h3>Preloved by Cia</h3></article>\n<article class=\"creative-card\"><img alt=\"Zephyr logo\" class=\"portfolio-media design\" src=\"assets/portfolio/logo-zephyr.png\"/><h3>Zephyr Fashion Studio</h3></article>\n</div>\n<h3 style=\"margin-top:36px\">Engagement Invitation Video</h3><article class=\"creative-card\" style=\"max-width:460px\"><video class=\"portfolio-video\" controls=\"\" preload=\"metadata\"><source src=\"assets/portfolio/engagement-card-video.mp4\" type=\"video/mp4\"/>Your browser does not support video playback.</video><h3>Digital Engagement Card</h3><p>Vertical 9:16 invitation-video creative.</p></article>\n</div></section>", "6.": "<section class=\"alt-section\"><div class=\"container\"><h2>6. Resume &amp; Offer Letters</h2>\n<p>Professional documents from your career journey. For privacy, remove personal addresses, phone numbers, employee IDs, signatures or other sensitive details before publishing offer letters.</p>\n<div class=\"project-grid\">\n<article class=\"project-card file-card\"><div class=\"asset-label\">Resume</div><a href=\"assets/resume/Rishikesh_Pandey_Resume.jpg\" target=\"_blank\"><img alt=\"Rishikesh Pandey resume\" class=\"resume-preview\" src=\"assets/resume/Rishikesh_Pandey_Resume.jpg\"/></a><h3>My Resume</h3><p>Professional resume \u2014 click the preview to open the full-size image.</p><a class=\"btn project-link\" href=\"assets/resume/Rishikesh_Pandey_Resume.jpg\" target=\"_blank\">View Resume \u2192</a></article>\n<article class=\"project-card file-card\"><div class=\"file-icon\">OFFER</div><h3>Company 1 \u2014 Offer Letter</h3><p>Role / Company / Year</p><a class=\"btn project-link\" href=\"#\" target=\"_blank\">View Offer Letter \u2192</a></article><article class=\"project-card file-card\"><div class=\"file-icon\">OFFER</div><h3>Company 2 \u2014 Offer Letter</h3><p>Role / Company / Year</p><a class=\"btn project-link\" href=\"#\" target=\"_blank\">View Offer Letter \u2192</a></article><article class=\"project-card file-card\"><div class=\"file-icon\">OFFER</div><h3>Company 3 \u2014 Offer Letter</h3><p>Role / Company / Year</p><a class=\"btn project-link\" href=\"#\" target=\"_blank\">View Offer Letter \u2192</a></article>\n</div></div></section>"};
  Object.entries(replacements).forEach(([prefix,html])=>{
    const heading=[...document.querySelectorAll("main h2")].find(h=>h.textContent.trim().startsWith(prefix));
    if(!heading) return;
    const oldSection=heading.closest("section");
    if(!oldSection) return;
    const holder=document.createElement("div"); holder.innerHTML=html.trim();
    const fresh=holder.firstElementChild; if(fresh) oldSection.replaceWith(fresh);
  });
}
document.addEventListener("DOMContentLoaded",()=>{ applyBuiltInPortfolioUpdates(); });

/* FINAL v12: keep user's saved Home edits, but force only the requested Home polish
   after old localStorage HTML has been restored. */
function applyFinalHomePolish(){
  if(fileName()!=="index.html") return;
  const main=document.querySelector("main");
  if(!main) return;

  const hero=main.querySelector(".hero-copy") || main.querySelector(".hero-grid > div:first-child");
  if(hero && !hero.querySelector(".hero-name")){
    const eyebrow=hero.querySelector(".eyebrow");
    if(eyebrow){
      const n=document.createElement("div");
      n.className="hero-name";
      n.textContent="Rishikesh Pandey";
      eyebrow.insertAdjacentElement("afterend",n);
    }
  }

  const row=main.querySelector(".social-row");
  if(row && !row.classList.contains("social-icons")){
    row.classList.add("social-icons");
    row.innerHTML=`
      <a class="social-icon instagram" href="https://www.instagram.com/rishikeshpandey.25" target="_blank" rel="noopener" title="Instagram" aria-label="Instagram">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle class="dot" cx="17.4" cy="6.7" r="1.15"/></svg><span>Instagram</span>
      </a>
      <a class="social-icon youtube" href="https://youtube.com/@rishikeshpandeyvlogs9507" target="_blank" rel="noopener" title="YouTube" aria-label="YouTube">
        <svg viewBox="0 0 24 24"><path class="solid" d="M21 8.2c-.2-1.5-1-2.6-2.5-2.8C16.5 5 12 5 12 5s-4.5 0-6.5.4C4 5.6 3.2 6.7 3 8.2 2.8 9.3 2.8 12 2.8 12s0 2.7.2 3.8c.2 1.5 1 2.6 2.5 2.8C7.5 19 12 19 12 19s4.5 0 6.5-.4c1.5-.2 2.3-1.3 2.5-2.8.2-1.1.2-3.8.2-3.8s0-2.7-.2-3.8Z"/><path class="cut" d="m10 9 5 3-5 3Z"/></svg><span>YouTube</span>
      </a>
      <a class="social-icon telegram" href="https://telegram.org/dl" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram">
        <svg viewBox="0 0 24 24"><path class="solid" d="M21 4 3.8 10.6c-1.2.5-1.2 1.2-.2 1.5L8 13.5l1.7 5.2c.2.6.1.9.8.9.5 0 .8-.2 1-.4l2.4-2.3 5 3.7c.9.5 1.6.3 1.8-.9L23.6 6c.3-1.2-.5-1.8-1.6-1.4Z"/></svg><span>Telegram</span>
      </a>
      <a class="social-icon email" href="mailto:rishikeshp700@gmail.com" title="Email" aria-label="Email">
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><span>Email</span>
      </a>`;
  }
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(applyFinalHomePolish,0));


/* FINAL LIVE FIX v14: GitHub Pages must use repository content, not browser-saved
   portfolio HTML/blob URLs from earlier local editing sessions. */
function clearLegacyPortfolioStorage(){
  if(fileName()!=="portfolio.html") return;
  try{
    Object.keys(localStorage).forEach(k=>{
      if(k.startsWith(EDIT_KEY_PREFIX) || k.startsWith(IMG_KEY_PREFIX)) localStorage.removeItem(k);
    });
  }catch(e){}
}
clearLegacyPortfolioStorage();
