import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logoContainer}>
        <div className={styles.logo}>
          <img src="/favicon.ico" alt="Logo" width="32" height="32" />
        </div>
        <h1 className={styles.title}>Nutrient Calculator</h1>
      </Link>
    </header>
  );
} 