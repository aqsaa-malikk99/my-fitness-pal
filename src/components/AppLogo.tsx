const base = import.meta.env.BASE_URL;

type Props = {
  /** Max height in px; width follows the asset (typical wide logo). */
  height?: number;
};

export default function AppLogo({ height = 40 }: Props) {
  return (
    <img
      src={`${base}app-logo.png`}
      alt="FitnessCoach"
      height={height}
      className="app-logo__img"
      decoding="async"
    />
  );
}
