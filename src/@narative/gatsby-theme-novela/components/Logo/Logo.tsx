import React from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/core";

import mediaqueries from "@styles/media";

import { Icon } from '@types';
import Headings from "../Headings";

const Logo: Icon = ({ fill = "white" }) => {
  return (
    <LogoContainer>
      <Headings.logoDesktop className="Logo__Desktop">직고래<Headings.logoDesktopSub>기술 블로그</Headings.logoDesktopSub></Headings.logoDesktop>
      <Headings.logoMobile className="Logo__Mobile">직고래<Headings.logoMobileSub>기술 블로그</Headings.logoMobileSub></Headings.logoMobile>
    </LogoContainer>
  );
};

export default Logo;

const LogoContainer = styled.div`
  .Logo__Mobile {
    display: none;
  }

  ${mediaqueries.tablet`
    .Logo__Desktop {
      display: none;
    }
    
    .Logo__Mobile{
      display: block;
    }
  `}
`;
