export function createCameraState(element, initial = {}) {
  const state = {
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    ...initial,
  };

  const apply = () => {
    element.style.transform = `translate3d(${state.x}px, ${state.y}px, ${state.z}px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) rotateZ(${state.rz}deg)`;
  };

  apply();
  state.apply = apply;
  return state;
}

export function tweenCamera(tl, state, vars, position) {
  const { duration = 1, ease = 'power2.inOut', ...props } = vars;
  tl.to(state, {
    ...props,
    duration,
    ease,
    onUpdate: state.apply,
    immediateRender: false,
  }, position);
}

export function createDeviceSlot(child) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const floater = document.createElement('div');
  floater.className = 'floater';
  floater.append(child);
  slot.append(floater);

  const state = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 };
  const apply = () => {
    slot.style.transform = `translate(-50%, -50%) translate3d(${state.x}px, ${state.y}px, ${state.z}px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) rotateZ(${state.rz}deg) scale(${state.s})`;
  };
  apply();
  state.apply = apply;
  return { slot, floater, state };
}

export function tweenSlot(tl, state, vars, position) {
  const { duration = 1, ease = 'power3.inOut', ...props } = vars;
  tl.to(state, {
    ...props,
    duration,
    ease,
    onUpdate: state.apply,
    immediateRender: false,
  }, position);
}

export function setAt(tl, state, props, position) {
  tl.set(state, { ...props, onUpdate: state.apply }, position);
}
