import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <p>개발자: 김동필 (충남대학교 원예학과)</p>
        <p><a href="https://www.cnuvege.com/" target="_blank" rel="noopener noreferrer">cnuvege.com</a></p>
        <p><a href="https://github.com/vlfrmfla/" target="_blank" rel="noopener noreferrer">Github</a></p>
      </div>
    </footer>
  );
};

export default Footer;
