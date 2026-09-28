/* Chạy tính cho cả dải NPS và chọn schedule nhẹ nhất còn đạt. */
(function (root) {
  'use strict';
  const D = root.PTW.data;
  const C = root.PTW.calc;

  /* base: { codeKey, P, S, E, W, Y, c, tol, structMin, SMYS, F, Tf }
     npsList: danh sách NPS cần tính
     fixedSched: nếu đặt thì ép dùng schedule này thay vì tự chọn */
  function runRange(base, npsList, fixedSched) {
    const rows = [];
    for (const nps of npsList) {
      const Do = D.OD[nps];
      if (!Do) continue;
      const row = { nps: nps, DN: D.DN[nps], Do: Do };

      let bare;
      try {
        bare = C.compute(base.codeKey, Object.assign({}, base, { D: Do, Tnom: 0 }));
      } catch (exc) {
        row.error = exc.message;
        rows.push(row);
        continue;
      }
      row.t = bare.t;
      row.tm = bare.tm;
      row.tOrder = bare.tOrder;
      row.Y = bare.Y;
      row.thick = bare.thick;
      row.warnings = bare.warnings.slice();

      const avail = D.schedulesFor(nps);
      const tried = [];
      let chosen = null;

      const list = fixedSched ? avail.filter(s => s === fixedSched) : avail;
      for (const s of list) {
        const Tnom = D.wallOf(nps, s);
        let r;
        try {
          r = C.compute(base.codeKey, Object.assign({}, base, { D: Do, Tnom: Tnom }));
        } catch (exc) { continue; }
        tried.push({ sched: s, Tnom: Tnom, Tprime: r.Tprime, pass: r.pass,
                     margin: r.margin, Pmax: r.Pmax, ratio: r.ratio });
        const bigEnough = base.structMin > 0 ? Tnom >= base.structMin : true;
        if (!chosen && r.pass && bigEnough) {
          chosen = { sched: s, Tnom: Tnom, Tprime: r.Tprime, margin: r.margin,
                     Pmax: r.Pmax, ratio: r.ratio, warnings: r.warnings };
        }
      }
      row.tried = tried;
      row.chosen = chosen;
      if (chosen) row.warnings = row.warnings.concat(chosen.warnings);
      if (!chosen) {
        row.warnings.push({ lv: 'bad',
          text: fixedSched
            ? ('Schedule ' + fixedSched + ' KHÔNG đạt cho NPS ' + nps + '.')
            : ('Không schedule nào trong bảng đạt cho NPS ' + nps +
               '. Cần chiều dày đặt hàng ≥ ' + bare.tOrder.toFixed(2) + ' mm.'),
          basis: '' });
      }
      rows.push(row);
    }
    return rows;
  }

  /* Tổng hợp cảnh báo, gộp trùng lặp theo nội dung */
  function collectWarnings(rows) {
    const seen = new Map();
    for (const r of rows) {
      for (const w of (r.warnings || [])) {
        const key = w.lv + '|' + w.text;
        if (!seen.has(key)) seen.set(key, { w: w, nps: [] });
        seen.get(key).nps.push(r.nps);
      }
    }
    const rank = { bad: 0, warn: 1, info: 2 };
    return Array.from(seen.values())
      .sort((a, b) => (rank[a.w.lv] ?? 3) - (rank[b.w.lv] ?? 3));
  }

  root.PTW = root.PTW || {};
  root.PTW.select = { runRange, collectWarnings };
})(typeof globalThis !== 'undefined' ? globalThis : this);
