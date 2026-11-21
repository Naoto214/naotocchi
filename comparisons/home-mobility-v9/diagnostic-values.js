    const normalDistance = row.ambientDistance - row.escapeDistance;
    const longest = Math.max(row.longestResolvedFailure, row.openFailure ? report.modelSeconds - row.openFailure.start : 0);
    const decisions = row.ambientPlans + row.ambientFailures;
    const values = {
      normalArrivals: row.ambientArrivals - row.escapeArrivals,
      normalDistance, actualDistance: row.actualDistance,
      escapeDistance: row.escapeDistance, yieldDistance: row.yieldDistance,
      successPercent: decisions ? (100 * row.ambientPlans / decisions).toFixed(1) + '%（' + row.ambientPlans + '/' + decisions + '）' : '経路判定待ち',
      failedFor: secs(longest), lastMovedAgo: secs(row.lastMovedAgo),
    };
    for (const key of ['normalDistance','actualDistance','escapeDistance','yieldDistance']) {
      values[key] = values[key].toFixed(1) + ' 地形px';
    }
    metrics.forEach(([,key],i) => { fields[i].textContent = String(values[key] ?? row[key] ?? '—'); });
