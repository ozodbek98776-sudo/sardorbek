import{u as o,r as l,j as e,aL as r}from"./react-vendor-kRcLyswm.js";import{u as i}from"./admin-pages-DXyrI0Rd.js";import{s as n,v as m}from"./components-B4j_hsC3.js";import"./vendor-C9ofp8Ii.js";import"./socket-vendor-FnhwKf0V.js";import"./qrcode-vendor-CTsHf0rC.js";import"./http-vendor-unpk9H19.js";function b(){const{user:u,logout:c}=i();o();const[s,t]=l.useState(!1),a=()=>{window.toggleSidebar&&window.toggleSidebar()};return e.jsxs("div",{className:"min-h-screen bg-surface-50",children:[e.jsx(n,{items:m,basePath:"/helper",collapsed:s,setCollapsed:t}),e.jsx("main",{className:`
        transition-all duration-300 ease-smooth
        ${s?"lg:ml-0":"lg:ml-64"}
        ml-0
        min-h-screen
        p-0 m-0
      `,children:e.jsx("div",{className:"w-full h-full",children:e.jsx(r,{context:{onMenuToggle:a}})})})]})}export{b as default};
