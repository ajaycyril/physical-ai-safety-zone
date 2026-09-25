import type { Metadata } from "next";
import PhysicalIntelligenceLab from "./PhysicalIntelligenceLab";
import styles from "./lab.module.css";

export const metadata: Metadata = {
  title: "Physical Intelligence Lab — Live Robotics Stack",
  description:
    "A live browser robotics stack with MuJoCo physics, a world-state engine, mission orchestration, policy routing, safety and camera perception.",
};

export default function LabPage() {
  return (
    <main className={styles.page}>
      <PhysicalIntelligenceLab />
    </main>
  );
}
