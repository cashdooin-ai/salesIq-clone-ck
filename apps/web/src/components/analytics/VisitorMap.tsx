interface VisitorMapProps {
  data: { location: string; count: number }[];
}

export function VisitorMap({ data }: VisitorMapProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">No location data available</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Visitors by Location</h3>
      </div>
      <div className="divide-y p-6">
        {data.map((item, index) => {
          const percentage = ((item.count / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between py-3">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.location}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.count} ({percentage}%)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
