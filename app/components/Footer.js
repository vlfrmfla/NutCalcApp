import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <p>국립원예특작과학원 시설원예연구소 개발자: 김동필 | homepage: vlfrmfla@github.com</p> 
        <p>주소: 경남 함안군 진함로 1425</p>
        <p>
          <a href="#">개인정보처리방침</a> | <a href="#">이용약관</a> | <a href="https://www.nongsaro.go.kr/">농촌진흥청 농사로 홈페이지</a>
        </p>
        <p> 농촌진흥청 RDA </p>
      </div>
    </footer>
  );
};

export default Footer;
