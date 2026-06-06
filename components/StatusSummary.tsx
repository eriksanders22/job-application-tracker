type StatusSummaryCard = {
  label: string;
  count: number;
};

type StatusSummaryProps = {
  cards: StatusSummaryCard[];
};

export function StatusSummary({ cards }: StatusSummaryProps) {
  return (
    <section className="summary-grid" aria-label="Application summary">
      {cards.map((card) => (
        <div className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.count}</strong>
        </div>
      ))}
    </section>
  );
}
