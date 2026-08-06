export function applyTraitEffect(traitId, state) {
  const delta = {};

  switch (traitId) {
    case 'chanceux':
      if (Math.random() < 0.3) delta.cash = Math.round((state.valuation ?? state.val ?? 0) * 0.01 + 5);
      break;

    case 'resilient':
      delta.stress = -9;
      break;

    case 'impulsif': {
      const sign = Math.random() < 0.5 ? 1 : -1;
      delta.val = sign * 13;
      if (sign < 0) delta.stress = 10;
      break;
    }

    case 'perfectionniste':
      delta.val = 10;
      delta.stress = 8;
      break;

    case 'sociable':
      delta.cash = 3;
      break;

    case 'charismatique':
      // bonus narrative, no passive effect each year
      break;

    // Legacy trait ids from prior versions
    case 'visionnaire':
      delta.val = Math.round((state.valuation ?? state.val ?? 0) * 0.02);
      break;
    case 'negociateur':
      delta.cash = 2;
      break;
    case 'batisseur':
      delta.stress = -3;
      break;
    case 'prudent':
      delta.stress = -5;
      break;
    case 'audacieux':
      delta.val    = Math.round((state.valuation ?? state.val ?? 0) * 0.03);
      delta.stress = 3;
      break;
    case 'empathique':
      if ((state.propertyList ?? state.properties ?? []).length > 0) delta.cash = 1;
      break;

    default:
      break;
  }

  return delta;
}

export function modifyEffByTrait(traitId, eff) {
  if (!eff) return {};
  const e = { ...eff };

  switch (traitId) {
    case 'chanceux':
      if (e.cash && e.cash > 0) e.cash = Math.round(e.cash * 1.1);
      break;
    case 'resilient':
      if (e.stress && e.stress > 0) e.stress = Math.round(e.stress * 0.7);
      break;
    case 'impulsif':
      if (e.cash) e.cash = Math.round(e.cash * (Math.random() < 0.5 ? 1.3 : 0.7));
      break;
    case 'perfectionniste':
      if (e.val  && e.val  > 0) e.val   = Math.round(e.val  * 1.15);
      if (e.stress)              e.stress = Math.round(e.stress * 1.1);
      break;
    case 'sociable':
      if (e.cash && e.cash > 0) e.cash = Math.round(e.cash * 1.1);
      break;
    // Legacy
    case 'negociateur':
      if (e.cash && e.cash > 0) e.cash = Math.round(e.cash * 1.15);
      if (e.val  && e.val  > 0) e.val  = Math.round(e.val  * 1.1);
      break;
    case 'batisseur':
      if (e.cash && e.cash < 0) e.cash = Math.round(e.cash * 0.85);
      break;
    case 'prudent':
      if (e.stress && e.stress > 0) e.stress = Math.round(e.stress * 0.75);
      break;
    case 'audacieux':
      if (e.cash) e.cash = Math.round(e.cash * 1.2);
      if (e.val)  e.val  = Math.round(e.val  * 1.2);
      break;
    case 'empathique':
      if (e.stress && e.stress > 0) e.stress = Math.round(e.stress * 0.8);
      break;
    case 'visionnaire':
      if (e.val && e.val > 0) e.val = Math.round(e.val * 1.25);
      break;
    default:
      break;
  }

  return e;
}
