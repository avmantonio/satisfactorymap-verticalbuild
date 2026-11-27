import {
  upsertNode,
  renderProjections,
} from "file:///C:/Users/Usuario/.cursor/plugins/local/wayfinder-graph/scripts/projection.mjs";

const workspaceRoot =
  "c:/Users/Usuario/Documents/satisfactory/satis-map/satisfactorymap";
const feature = "vertical-builds";
const event = process.argv[2];

if (event === "claim") {
  const graph = upsertNode({
    workspaceRoot,
    feature,
    node: { id: "41", status: "claimed" },
  });
  renderProjections({ workspaceRoot, feature, targets: ["html"] });
  const node = graph.nodes.find((n) => n.id === "41");
  console.log(JSON.stringify({ event, node }, null, 2));
} else if (event === "resolve") {
  const graph = upsertNode({
    workspaceRoot,
    feature,
    node: {
      id: "41",
      status: "resolved",
      gist: "GO. A real multi-height region can be drawn with checkable spatial relations and stable behavior in the environments the phase-1 probes actually ran.",
    },
  });
  renderProjections({ workspaceRoot, feature, targets: ["html"] });
  const node = graph.nodes.find((n) => n.id === "41");
  console.log(JSON.stringify({ event, node }, null, 2));
} else if (event === "asset") {
  const graph = upsertNode({
    workspaceRoot,
    feature,
    node: {
      id: "35",
      status: "claimed",
      assets: [
        ".scratch/vertical-builds/prototype/transform-proof.html",
        ".scratch/vertical-builds/prototype/transform-exceptions.md",
        ".scratch/vertical-builds/prototype/transform-samples.json",
      ],
    },
  });
  renderProjections({ workspaceRoot, feature, targets: ["html"] });
  const node = graph.nodes.find((n) => n.id === "35");
  console.log(JSON.stringify({ event, node }, null, 2));
} else {
  console.error("usage: node _graph-event.mjs claim|resolve|asset");
  process.exit(2);
}
