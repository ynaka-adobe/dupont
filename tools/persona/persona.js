const AXES = ['Explore', 'Research', 'Compare', 'Purchase', 'Deals', 'Support'];

const PERSONAS = [
  {
    name: 'Architect & Designer',
    description: 'A professional architect or interior designer specifying Corian® solid surface for residential or commercial projects, focused on technical specifications, customization capability, and design flexibility.',
    interests: [
      { label: 'Corian® Texture...', value: 50 },
      { label: 'Corian® Kitchen...', value: 40 },
      { label: 'Corian® Bathroo...', value: 30 },
    ],
    intent: {
      Explore: 0.55, Research: 0.85, Compare: 0.75, Purchase: 0.2, Deals: 0.15, Support: 0.3,
    },
    summary: 'Focused on design flexibility and technical specifications',
    metrics: 'avg 4h dwell · 63% scroll · 7 clicks · 10 pages',
    trajectory: 'trajectory: 10 product pages visited',
  },
  {
    name: 'Homeowner Renovator',
    description: 'A homeowner planning a kitchen or bathroom remodel, comparing materials, prices, and finishes before committing to a purchase.',
    interests: [
      { label: 'Cost-effective remodel...', value: 60 },
      { label: 'Color patterns...', value: 45 },
      { label: 'Countertops...', value: 35 },
    ],
    intent: {
      Explore: 0.4, Research: 0.5, Compare: 0.8, Purchase: 0.65, Deals: 0.7, Support: 0.35,
    },
    summary: 'Focused on cost, color, and purchase readiness',
    metrics: 'avg 2h dwell · 48% scroll · 12 clicks · 6 pages',
    trajectory: 'trajectory: 6 product pages visited',
  },
  {
    name: 'Contractor / Fabricator',
    description: 'A trade professional sourcing materials at scale, prioritizing availability, technical support, and dealer relationships.',
    interests: [
      { label: 'Bulk ordering...', value: 55 },
      { label: 'Technical support...', value: 50 },
      { label: 'Dealer network...', value: 40 },
    ],
    intent: {
      Explore: 0.25, Research: 0.4, Compare: 0.35, Purchase: 0.55, Deals: 0.5, Support: 0.85,
    },
    summary: 'Focused on support and fulfillment reliability',
    metrics: 'avg 1h dwell · 30% scroll · 4 clicks · 3 pages',
    trajectory: 'trajectory: 3 product pages visited',
  },
];

function polarPoint(centerX, centerY, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

function pointsToAttr(points) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function renderRadar(svg, intent) {
  const size = 260;
  const center = size / 2;
  const maxRadius = 95;
  const step = 360 / AXES.length;

  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // grid rings
  [0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const points = AXES.map((_, i) => polarPoint(center, center, maxRadius * ratio, i * step));
    ring.setAttribute('points', pointsToAttr(points));
    ring.setAttribute('class', 'persona-radar-grid');
    svg.append(ring);
  });

  // axis lines + labels
  AXES.forEach((axis, i) => {
    const outer = polarPoint(center, center, maxRadius, i * step);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', center);
    line.setAttribute('y1', center);
    line.setAttribute('x2', outer.x);
    line.setAttribute('y2', outer.y);
    line.setAttribute('class', 'persona-radar-axis');
    svg.append(line);

    const labelPoint = polarPoint(center, center, maxRadius + 16, i * step);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', labelPoint.x);
    label.setAttribute('y', labelPoint.y);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('class', 'persona-radar-label');
    label.textContent = axis;
    svg.append(label);
  });

  // filled shape
  const shapePoints = AXES.map((axis, i) => polarPoint(
    center,
    center,
    maxRadius * (intent[axis] ?? 0),
    i * step,
  ));
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  shape.setAttribute('points', pointsToAttr(shapePoints));
  shape.setAttribute('class', 'persona-radar-shape');
  svg.append(shape);
}

function renderPersona(persona) {
  document.getElementById('persona-name').textContent = persona.name;
  document.getElementById('persona-description').textContent = persona.description;
  document.getElementById('persona-summary').textContent = persona.summary;
  document.getElementById('persona-metrics').textContent = persona.metrics;
  document.getElementById('persona-trajectory').textContent = persona.trajectory;

  const interests = document.getElementById('persona-interests');
  interests.innerHTML = '';
  persona.interests.forEach((interest) => {
    const row = document.createElement('div');
    row.className = 'persona-interest';
    row.innerHTML = `
      <span class="persona-interest-label">${interest.label}</span>
      <span class="persona-interest-track">
        <span class="persona-interest-fill" style="width: ${interest.value}%"></span>
      </span>
      <span class="persona-interest-value">${interest.value}%</span>
    `;
    interests.append(row);
  });

  renderRadar(document.getElementById('persona-radar'), persona.intent);
}

function init() {
  const select = document.getElementById('persona-select');
  select.innerHTML = PERSONAS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
  select.addEventListener('change', () => renderPersona(PERSONAS[Number(select.value)]));
  renderPersona(PERSONAS[0]);
}

init();
