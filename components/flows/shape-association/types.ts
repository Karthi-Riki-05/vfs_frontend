// Shared types for the Shape → Team / Chat Group association feature.

// Reference to the diagram cell being associated. `shapeId` is the backend
// Shape row id (null until the first association creates one); `cellId` is
// the draw.io mxCell id used to write the vcShapeId attribute back.
export interface ShapeRef {
  shapeId: string | null;
  cellId: string;
  shapeName: string;
  shapeXml?: string;
}

export interface ShapeAssociation {
  type: "team" | "group";
  id: string;
  name: string;
}

// Payload sent back to EditorView after a successful associate call so it
// can stamp the cell inside the iframe and update the association cache.
export interface AssociationResult {
  shapeId: string;
  cellId: string;
  association: ShapeAssociation;
}
