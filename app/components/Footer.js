import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <p>본 웹 소프트웨어 사용의 책임은 전적으로 본인에게 있습니다.</p>
        <p>개발자: 김동필 | homepage: https://www.cnuvege.com/</p> 
        <p>충남대학교 원예학과 주소: 대전광역시 유성구 대학로 99</p>
        <p>
          <a href="#">개인정보처리방침</a> | <a href="#">이용약관</a> | Error report: <a href="https://github.com/vlfrmfla/">Github 코드 페이지 Issue</a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
