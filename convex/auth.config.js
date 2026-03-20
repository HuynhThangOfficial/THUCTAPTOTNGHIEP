export default {
  providers: [
    {
      // Dùng biến môi trường thay vì hardcode link
      domain: process.env.CLERK_ISSUER_URL, 
      applicationID: "convex",
    },
  ]
};