import HomeOverview from "./components/HomeOverview";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <HomeOverview />
    </div>
  );
}
