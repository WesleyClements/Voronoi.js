const getLineIntersection = (a1, a2, b1, b2) => {
  let dax = a1.x - a2.x;
  let dbx = b1.x - b2.x;
  let day = a1.y - a2.y;
  let dby = b1.y - b2.y;

  let Den = dax * dby - day * dbx;
  if (Den == 0) return null; // parallel

  let A = a1.x * a2.y - a1.y * a2.x;
  let B = b1.x * b2.y - b1.y * b2.x;

  return new Point((A * dbx - dax * B) / Den, (A * dby - day * B) / Den);
};
