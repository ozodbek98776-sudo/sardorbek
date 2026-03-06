import{r as t,j as e,aL as o}from"./react-vendor-kRcLyswm.js";import{s as l,t as r}from"./components-B4j_hsC3.js";import"./vendor-C9ofp8Ii.js";import"./socket-vendor-FnhwKf0V.js";import"./qrcode-vendor-CTsHf0rC.js";import"./admin-pages-DXyrI0Rd.js";import"./http-vendor-unpk9H19.js";function u(){const[a,s]=t.useState(!1),i=()=>{window.toggleSidebar&&window.toggleSidebar()};return e.jsxs("div",{className:"min-h-screen",style:{background:"linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)"},children:[e.jsx(l,{items:r,basePath:"/admin",collapsed:a,setCollapsed:s}),e.jsx("main",{className:`
        transition-all duration-300 ease-smooth
        
        /* Desktop: margin for sidebar */
        ${a?"lg:ml-0":"lg:ml-64"}
        
        /* Mobile: NO margin (sidebar is overlay) */
        ml-0
        
        /* Full height */
        min-h-screen
        
        /* No padding */
        p-0 m-0
      `,children:e.jsx("div",{className:"w-full h-full",children:e.jsx(o,{context:{onMenuToggle:i}})})})]})}export{u as default};
