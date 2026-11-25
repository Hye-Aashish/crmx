export type OrderDatePreset = 'all' | 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

export interface OrderDateBounds {
  from: string;
  toExclusive: string;
  fromKey: string;
  toKey: string;
}

export const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const localDayStartIso = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toISOString();
};

export const orderDateBounds = (preset: OrderDatePreset, from: string, to: string, now = new Date()): OrderDateBounds | null => {
  if (preset === 'all') return null;
  let startKey: string;
  let endKeyExclusive: string;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (preset === 'today') {
    startKey = localDateKey(now);
    endKeyExclusive = localDateKey(tomorrow);
  } else if (preset === 'last7') {
    startKey = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    endKeyExclusive = localDateKey(tomorrow);
  } else if (preset === 'thisMonth') {
    startKey = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    endKeyExclusive = localDateKey(tomorrow);
  } else if (preset === 'lastMonth') {
    startKey = localDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    endKeyExclusive = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  } else {
    if (!from || !to || to < from) return null;
    startKey = from;
    const [year, month, day] = to.split('-').map(Number);
    endKeyExclusive = localDateKey(new Date(year, month - 1, day + 1));
  }

  const [endYear, endMonth, endDay] = endKeyExclusive.split('-').map(Number);
  const finalIncludedDay = new Date(endYear, endMonth - 1, endDay - 1);
  return {
    from: localDayStartIso(startKey),
    toExclusive: localDayStartIso(endKeyExclusive),
    fromKey: startKey,
    toKey: preset === 'custom' ? to : localDateKey(finalIncludedDay)
  };
};

export const displayDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
