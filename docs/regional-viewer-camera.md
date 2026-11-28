# Regional viewer camera

The 3D viewer initially frames the complete queried regional volume, while
keeping the occupant-adapted visual Z window active. **Reset section view**
fits the camera to the currently visible altitude section, so changing the
visual Z range and resetting keeps the inspected level in focus.

**Frame full region** fits the complete queried regional volume. It changes
only the camera framing: the current visual Z filter and the set of admitted
occupants remain unchanged. Use **Reset section view** to return to the active
altitude section.

Resetting to the visible section is a presentation choice that differs from
the integration contract's original full-volume reset behavior. The initial
view continues to follow that contract, and the full region remains directly
reachable from the viewer toolbar.
