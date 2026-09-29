import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects(){return [
    ...Object.entries({'physical-intelligence.html':'thesis','physical-ai-stack.html':'operating-stack','world-models.html':'world-model','robotics-stack.html':'robotics','studio.html':'demos/factory','city.html':'demos/city','live-system.html':'demos','architecture':'operating-stack'}).map(([a,b])=>({source:'/'+a,destination:'/'+b,permanent:true}))
  ];},
  async rewrites(){return [
    ...['thesis','operating-stack','world-model','robotics','demos','roadmap','why-ajay'].map(p=>({source:'/'+p,destination:'/pages/'+p+'.html'})),
    {source:'/demos/factory',destination:'/pages/factory.html'},
    {source:'/demos/city',destination:'/pages/city.html'},
  ];},
  turbopack: {
    resolveAlias: {
      module: {
        browser: "./app/lab/node-module-shim.ts",
      },
    },
  },
};

export default nextConfig;
