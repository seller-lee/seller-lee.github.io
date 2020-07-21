module.exports = {
  siteMetadata: {
    title: `Seller.Lee`,
    name: `Seller.Lee`,
    siteUrl: `https://seller-lee.github.io/`,
    description: `Seller. Lee의 기술 블로그입니다.`,
    hero: {
      heading: `중고 거래를 더 쉽고 간편하게 도와드릴게요, 당신의 비서 Seller. Lee`,
      maxWidth: 640,
    },
    social: [
      {
        name: `github`,
        url: `https://github.com/seller-lee`,
      },
    ],
  },
  plugins: [
    {
      resolve: "@narative/gatsby-theme-novela",
      options: {
        contentPosts: "content/posts",
        contentAuthors: "content/authors",
        basePath: "/",
        authorsPage: true,
        sources: {
          local: true,
          // contentful: true,
        },
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Seller. Lee Tech Blog`,
        short_name: `Seller. Lee`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#fff`,
        display: `standalone`,
        icon: `src/assets/favicon.png`,
      },
    },
    {
      resolve: `gatsby-plugin-netlify-cms`,
      options: {
      },
    },
  ],
};
