import WeatherCard from "./components/WeatherCard";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <WeatherCard />
    </div>
  );
}
