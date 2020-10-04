import styled from "@emotion/styled";
import mediaqueries from "@styles/media";

const Blockquote = styled.blockquote`
  transition: ${p => p.theme.colorModeTransition};
  margin: 15px auto 50px;
  color: ${p => p.theme.colors.blockquoteText};
  font-family: ${p => p.theme.fonts.serif};
  font-style: italic;
  ${mediaqueries.tablet`
    margin: 10px auto 35px;
  `};

  & > p {
    color: ${p => p.theme.colors.blockquoteText};
    font-family: ${p => p.theme.fonts.serif};
    max-width: 880px !important;
    padding-right: 100px;
    padding-bottom: 0;
    width: 100%;
    margin: 0 auto;
    font-size: 18px;
    line-height: 1.32;
    font-weight: bold;

    ${mediaqueries.tablet`
      font-size: 13px;
      padding: 0 40px;
    `};

    ${mediaqueries.phablet`
      font-size: 18px;
      padding: 0 20px 0 40px;
    `};
  }
`;

export default Blockquote;
