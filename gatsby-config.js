module.exports = {
  siteMetadata: {
    title: `직고래 기술 블로그`,
    name: `Jikgorae`,
    siteUrl: `https://seller-lee.github.io/`,
    description: `직고래의 기술 블로그입니다.`,
    hero: {
      heading: `직고래가 겪은 다양한 문제들과 해결 과정 및 개발 문화를 공유하는 기술 블로그입니다.`,
      maxWidth: 920,
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
        name: `Jikgorae`,
        short_name: `Jikgorae`,
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
