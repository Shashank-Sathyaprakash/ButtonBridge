// Bridges the app's 11 mapping-row keys (camelCase; the 4 gesture
// directions are separate rows because each can hold its own action)
// to the 3D model's 7 physical hotspot ids (snake_case; the thumb-rest
// button is one physical hotspot, so all 5 gesture rows collapse onto
// the single "gesture" pin).

export const SLOT_TO_MODEL_ID = {
  middleClick: "middle_click",
  modeShift: "mode_shift",
  thumbLeft: "thumb_left",
  thumbRight: "thumb_right",
  forward: "forward",
  back: "back",
  gestureTap: "gesture",
  gestureUp: "gesture",
  gestureDown: "gesture",
  gestureLeft: "gesture",
  gestureRight: "gesture",
};

// Inverse mapping for when a pin is clicked on the model — "gesture"
// resolves to the tap mapping by default; the 4 directional rows stay
// reachable from the row list underneath.
export const MODEL_ID_TO_SLOT = {
  middle_click: "middleClick",
  mode_shift: "modeShift",
  thumb_left: "thumbLeft",
  thumb_right: "thumbRight",
  forward: "forward",
  back: "back",
  gesture: "gestureTap",
};
