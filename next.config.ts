import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects(){return [
    {source:'/:path*',has:[{type:'host' as const,value:'analog-physical-intelligence.vercel.app'}],destination:'https://physical-ops-lab.vercel.app/:path*',permanent:true},
    {source:'/:path*',has:[{type:'host' as const,value:'next-project-to-show-physical-ai.vercel.app'}],destination:'https://physical-ops-lab.vercel.app/:path*',permanent:true},
    {source:'/eand-stack',destination:'/operating-stack',permanent:true},
    {source:'/pages/eand-stack.html',destination:'/operating-stack',permanent:true},
    {source:'/payload/:path*',destination:'/thesis',permanent:false},
    ...Object.entries({'physical-intelligence.html':'thesis','physical-ai-stack.html':'operating-stack','world-models.html':'world-model','robotics-stack.html':'robotics','studio.html':'demos/factory','city.html':'demos/city','live-system.html':'demos','architecture':'operating-stack'}).map(([a,b])=>({source:'/'+a,destination:'/'+b,permanent:true}))
  ];},
  async rewrites(){return [
    ...['thesis','operating-stack','world-model','robotics','demos','roadmap','why-ajay'].map(p=>({source:'/'+p,destination:'/pages/'+p+'.html'})),
    {source:'/demos/factory',destination:'/pages/factory.html'},
    {source:'/demos/city',destination:'/pages/city.html'}
  ];},
  turbopack:{resolveAlias:{module:{browser:'./app/lab/node-module-shim.ts'}}}
};
export default nextConfig;
