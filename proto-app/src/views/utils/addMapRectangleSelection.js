import mapboxgl from 'mapbox-gl';

export const addMapRectangleSelection = (map, store) => {
  // adds functionality to select places by drawing a rectangle on the map
  // by holding shift and dragging
  // https://docs.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/

  const canvas = map.getCanvasContainer();

  // Variable to hold the starting xy coordinates
  // when `mousedown` occured.
  let start;

  // Variable to hold the current xy coordinates
  // when `mousemove` or `mouseup` occurs.
  let current;

  // Variable for the draw box element.
  let box;

  // Set `true` to dispatch the event before other functions
  // call it. This is necessary for disabling the default map
  // dragging behaviour.
  canvas.addEventListener('mousedown', mouseDown, true);

  // Return the xy coordinates of the mouse position
  function mousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return new mapboxgl.Point(
      e.clientX - rect.left - canvas.clientLeft,
      e.clientY - rect.top - canvas.clientTop
    );
  }

  function mouseDown(e) {
    // Continue the rest of the function if the shiftkey is pressed.
    if (!(e.shiftKey && e.button === 0)) return;

    // Disable default drag zooming when the shift key is held down.
    map.dragPan.disable();

    // Call functions for the following events
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);

    // Capture the first xy coordinates
    start = mousePos(e);
  }

  function onMouseMove(e) {
    // Capture the ongoing xy coordinates
    current = mousePos(e);

    // Append the box element if it doesnt exist
    if (!box) {
      box = document.createElement('div');
      box.style.cssText = `
        background: rgba(56, 135, 190, 0.1);
        border: 2px solid #0075FF;
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
      `
      canvas.appendChild(box);
    }

    const minX = Math.min(start.x, current.x),
      maxX = Math.max(start.x, current.x),
      minY = Math.min(start.y, current.y),
      maxY = Math.max(start.y, current.y);

    // Adjust width and xy position of the box element ongoing
    const pos = `translate(${minX}px, ${minY}px)`;
    box.style.transform = pos;
    box.style.width = maxX - minX + 'px';
    box.style.height = maxY - minY + 'px';
  }

  function onMouseUp(e) {
    // Capture xy coordinates
    finish([start, mousePos(e)]);
  }

  function onKeyDown(e) {
    // If the ESC key is pressed
    if (e.keyCode === 27) finish();
  }

  function finish(bbox) {
    // Remove these events now that finish has been called.
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('mouseup', onMouseUp);

    if (box) {
      box.parentNode.removeChild(box);
      box = null;
    }

    if (bbox) {
      const layers = store.state.regionTypeSelection === 'places'
        ? ['acs-places-click-target']
        : ['counties']
      const features = map.queryRenderedFeatures(bbox, {
        layers: layers
      });

      // clear previous
      store.commit('clearCurrentLocation')
      store.commit('setSelectedPlaceGeoids', [])
      store.commit('setSelectedCountyFips', [])
      store.commit('clearFocusedCounty')
      store.commit('clearFocusedPlace')

      if (features?.length) {
        const geoids = [...new Set(features.map((feature) => feature.properties.GEOID))]
        const mutation = store.state.regionTypeSelection == 'places'
          ? 'setSelectedPlaceGeoids'
          : 'setSelectedCountyFips'
        store.commit(mutation, geoids)
        store.commit('focusPlace', geoids[0])
      }
    }

    map.dragPan.enable();
  }
}
