import OptConstant from "../../Data/Constant/OptConstant";
import TextConstant from "../../Data/Constant/TextConstant";
import T3Gv from "../../Data/T3Gv";
import DynamicHit from "../../Model/DynamicHit";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import RulerUtil from "../UI/RulerUtil";
import LayerUtil from "./LayerUtil";
import PolyUtil from "./PolyUtil";


class DynamicUtil {

  /**
   * Gets snap objects for dynamic alignment guides
   * @param selectedObject - The currently selected object
   * @param bounds - The bounding rectangle of the selected object
   * @param dynamicGuides - Collection of dynamic guides
   * @param snapDistance - Maximum distance to consider for snapping
   * @param includeCenters - Flag to include center points in snapping
   * @param restrictToVisible - Flag to restrict snapping to visible objects only
   * @returns Collection of snap objects organized by location
   * @description This function analyzes objects in the active layer and creates
   * dynamic snap guides for alignment. It finds edges, centers, and intersections
   * that match the snap criteria.
   */
  static DynamicSnapsGetSnapObjects(selectedObject, bounds, dynamicGuides, snapDistance, includeCenters, restrictToVisible) {
    let objectCount, objectIndex, objectToCheck, rightEdge, bottomEdge, xCenter, yCenter;
    let targetRect, snapEdge, distance, distanceAbs, otherHits, dynamicHit;
    let leftEdgePos, topEdgePos, rightEdgePos, bottomEdgePos, centerX, centerY;

    const textJustification = TextConstant.TextJust;
    const activeObjectsList = LayerUtil.ActiveVisibleZList();
    objectCount = activeObjectsList.length;

    /**
     * Creates or updates a dynamic hit object for snapping
     * @param hitKey - Unique identifier for the hit
     * @param objectId - ID of the object being snapped to
     * @param snapValue - The snap position value
     * @param edgeValue - The edge position to snap to
     * @param edgeType - The type of edge (left, right, top, bottom, center)
     * @param distance - Distance between the object and snap point
     * @param aboveOrLeft - Flag indicating if the snap is above/left of object
     * @param labelVisible - Flag indicating if the label should be visible
     * @param isLeftRightDirection - Flag indicating if the snap is horizontal or vertical
     */
    const createOrUpdateDynamicHit = function (hitKey, objectId, snapValue, edgeValue, edgeType, distance, aboveOrLeft, labelVisible, isLeftRightDirection) {
      const snapDifference = snapValue - edgeValue;
      const absDifference = Math.abs(snapDifference);
      otherHits = [];

      const existingHit = dynamicGuides[hitKey];
      if (existingHit) {
        otherHits = existingHit.otherhits;
      }

      if (absDifference <= 5) {
        if (existingHit == null || distance < existingHit.distance) {
          if (existingHit) {
            otherHits.push(existingHit);
          }

          dynamicHit = new DynamicHit(objectId, snapDifference, edgeType, distance, aboveOrLeft, labelVisible, edgeType === textJustification.Center);
          dynamicHit.otherhits = otherHits;
          dynamicGuides[hitKey] = dynamicHit;
        } else {
          const newHit = new DynamicHit(objectId, snapDifference, edgeType, distance, aboveOrLeft, labelVisible, edgeType === textJustification.Center);
          existingHit.otherhits.push(newHit);
        }
      }
    };

    /**
     * Marks a dynamic hit as having a visible label
     * @param hit - The hit object to mark as having a label
     * @returns {boolean} True if the hit was marked, false if already labeled
     */
    const markAsLabel = function (hit) {
      let key, alreadyLabeled = false;

      for (key in dynamicGuides) {
        const guide = dynamicGuides[key];
        if (hit && guide && hit.ID == guide.ID && guide.label === true) {
          alreadyLabeled = true;
          break;
        }
      }

      if (!alreadyLabeled) {
        hit.label = true;
      }
    };

    /**
     * Processes other hits associated with a dynamic hit
     * @param hit - The primary dynamic hit
     * @description This function filters and processes additional hits related
     * to the primary hit, calculating proper positioning for visual guides.
     */
    const processDynamicHitOtherHits = function (hit) {
      let otherHit, previousHit;
      objectCount = hit.otherhits.length;

      let previousRect, filteredHits = [];

      // Filter hits that have similar snap values
      for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        otherHit = hit.otherhits[objectIndex];
        if (Utils2.IsEqual(otherHit.snap, hit.snap, 0.5)) {
          filteredHits.push(otherHit);
        }
      }

      hit.otherhits = filteredHits;
      objectCount = hit.otherhits.length;

      // Sort hits by distance
      if (objectCount > 1) {
        hit.otherhits.sort(function (a, b) {
          return a.distance === b.distance ? 0 : (a.distance < b.distance ? -1 : 1);
        });
      }

      // Process each hit to adjust positions and distances
      for (objectIndex = objectCount - 1; objectIndex >= 0; objectIndex--) {
        otherHit = hit.otherhits[objectIndex];
        DataUtil.GetObjectPtr(otherHit.ID, false).GetSnapRect();

        if (objectIndex > 0) {
          previousHit = hit.otherhits[objectIndex - 1];
          previousRect = DataUtil.GetObjectPtr(previousHit.ID, false).GetSnapRect();
        } else {
          previousHit = hit;
          previousRect = DataUtil.GetObjectPtr(hit.ID, false).GetSnapRect();
        }

        if (hit.leftright) {
          if (hit.aboveleft) {
            otherHit.distance -= previousHit.distance + previousRect.height;

            switch (hit.edge) {
              case textJustification.Left:
                otherHit.pt = { x: bounds.x, y: previousRect.y };
                break;
              case textJustification.Right:
                otherHit.pt = { x: rightEdge, y: previousRect.y };
                break;
              case textJustification.Center:
                otherHit.pt = { x: centerX, y: previousRect.y };
                break;
            }
          } else {
            otherHit.distance -= previousHit.distance + previousRect.height;

            switch (hit.edge) {
              case textJustification.Left:
                otherHit.pt = { x: bounds.x, y: previousRect.y + previousRect.height };
                break;
              case textJustification.Right:
                otherHit.pt = { x: rightEdge, y: previousRect.y + previousRect.height };
                break;
              case textJustification.Center:
                otherHit.pt = { x: centerX, y: previousRect.y + previousRect.height };
                break;
            }
          }
        } else {
          if (hit.aboveleft) {
            otherHit.distance -= previousHit.distance + previousRect.width;

            switch (hit.edge) {
              case textJustification.Top:
                otherHit.pt = { x: previousRect.x, y: previousRect.y };
                break;
              case textJustification.Bottom:
                otherHit.pt = { x: previousRect.x, y: bottomEdge };
                break;
              case textJustification.Center:
                otherHit.pt = { x: previousRect.x, y: centerY };
                break;
            }
          } else {
            otherHit.distance -= previousHit.distance + previousRect.width;

            switch (hit.edge) {
              case textJustification.Top:
                otherHit.pt = { x: previousRect.x + previousRect.width, y: previousRect.y };
                break;
              case textJustification.Bottom:
                otherHit.pt = { x: previousRect.x + previousRect.width, y: bottomEdge };
                break;
              case textJustification.Center:
                otherHit.pt = { x: previousRect.x + previousRect.width, y: centerY };
                break;
            }
          }
        }
      }
    };

    /**
     * Finds intersections between a line and a polygon
     * @param lineStart - Starting point of the line
     * @param lineEnd - Ending point of the line
     * @param objectToCheck - The object to check for intersections
     * @param isVertical - Whether the line is vertical or horizontal
     * @param requireBothSides - Whether intersections are required on both sides
     * @returns Array of intersection points and distances
     * @description This function calculates intersection points between a line and
     * a polygon object's points. It's used to find where guides should connect to objects.
     */
    const findPolygonLineIntersections = function (lineStart, lineEnd, objectToCheck, isVertical, requireBothSides) {
      let segmentIndex, pointIndex, pointsCount, distanceValue;
      let minLeftDistance, minRightDistance, leftPointIndex, rightPointIndex;
      let minLeftPoint, minRightPoint, segmentOffset = 0;
      let intersectionPoints = [], hits = [];

      // Get polygon points from the object
      const polyPoints = lineStart.GetPolyPoints(
        OptConstant.Common.MaxPolyPoints,
        false,
        false,
        false,
        null
      );

      // Find initial intersection
      let intersection = PolyUtil.PolyLIntersect(lineStart, lineEnd, polyPoints, polyPoints.length);

      // Find all intersections along the polygon
      while (intersection.bSuccess) {
        intersectionPoints.push(intersection.ipt);
        segmentOffset += intersection.lpseg;

        if (segmentOffset > polyPoints.length - 1) {
          break;
        }

        const remainingPoints = polyPoints.slice(segmentOffset);
        intersection = PolyUtil.PolyLIntersect(lineStart, lineEnd, remainingPoints, remainingPoints.length);
      }

      // Process intersection points based on direction (vertical/horizontal)
      if (isVertical) {
        pointsCount = intersectionPoints.length;

        for (pointIndex = 0; pointIndex < pointsCount; pointIndex++) {
          if (intersectionPoints[pointIndex].y <= bounds.y) {
            distanceValue = bounds.y - intersectionPoints[pointIndex].y;

            if (minLeftDistance === undefined || distanceValue < minLeftDistance) {
              minLeftDistance = distanceValue;
              leftPointIndex = pointIndex;
            }
          } else if (intersectionPoints[pointIndex].y >= bottomEdge) {
            distanceValue = intersectionPoints[pointIndex].y - bottomEdge;

            if (minRightDistance === undefined || distanceValue < minRightDistance) {
              minRightDistance = distanceValue;
              rightPointIndex = pointIndex;
            }
          }
        }

        // Add hits if found on both sides (or if not requiring both sides)
        if ((minLeftDistance !== undefined && minRightDistance !== undefined) || !requireBothSides) {
          if (minLeftDistance !== undefined) {
            hits.push({
              pt: intersectionPoints[leftPointIndex],
              dist: minLeftDistance
            });
          }

          if (minRightDistance !== undefined) {
            hits.push({
              pt: intersectionPoints[rightPointIndex],
              dist: minRightDistance
            });
          }
        }
      } else {
        pointsCount = intersectionPoints.length;

        for (pointIndex = 0; pointIndex < pointsCount; pointIndex++) {
          if (intersectionPoints[pointIndex].x <= bounds.x) {
            distanceValue = bounds.x - intersectionPoints[pointIndex].x;

            if (minLeftDistance === undefined || distanceValue < minLeftDistance) {
              minLeftDistance = distanceValue;
              leftPointIndex = pointIndex;
            }
          } else if (intersectionPoints[pointIndex].x >= rightEdge) {
            distanceValue = intersectionPoints[pointIndex].x - rightEdge;

            if (minRightDistance === undefined || distanceValue < minRightDistance) {
              minRightDistance = distanceValue;
              rightPointIndex = pointIndex;
            }
          }
        }

        // Add hits if found on both sides (or if not requiring both sides)
        if ((minLeftDistance !== undefined && minRightDistance !== undefined) || !requireBothSides) {
          if (minLeftDistance !== undefined) {
            hits.push({
              pt: intersectionPoints[leftPointIndex],
              dist: minLeftDistance
            });
          }

          if (minRightDistance !== undefined) {
            hits.push({
              pt: intersectionPoints[rightPointIndex],
              dist: minRightDistance
            });
          }
        }
      }

      return hits;
    };

    /**
     * Processes wall and room intersection guides for dynamic snapping
     * @param objectToProcess - The object being analyzed for intersections
     * @param objectBounds - The rectangle bounds of the target object
     * @param guideDistanceType - The type of guide distance calculation to perform
     * @description This function calculates intersections between objects and walls/rooms
     * for creating dynamic alignment guides. It determines where center lines of the selected
     * object intersect with walls and creates appropriate snap points.
     */
    const processWallAndRoomGuides = function (objectToProcess, objectBounds, guideDistanceType) {
      // Local variables from parent scope referenced in this function
      let distance, snapHit;
      const leftEdge = bounds.x;
      const topEdge = bounds.y;
      const rightEdge = bounds.x + bounds.width;
      const bottomEdge = bounds.y + bounds.height;
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const textJustification = TextConstant.TextJust;

      // Process Room guide type
      if (guideDistanceType === OptConstant.GuideDistanceTypes.Room) {
        let objectFrame = Utils1.DeepCopy(objectToProcess.Frame);
        const borderThickness = objectToProcess.StyleRecord.Line.BThick;

        // Adjust rectangle by border thickness
        Utils2.InflateRect(objectFrame, -borderThickness, -borderThickness);

        if (Utils2.IsRectangleFullyEnclosed(objectFrame, objectBounds)) {
          // Check horizontal center line intersections
          const horizontalStart = { x: leftEdge, y: centerY };
          const horizontalEnd = { x: rightEdge, y: centerY };
          const horizontalIntersections = findPolygonLineIntersections(
            objectToProcess,
            horizontalStart,
            horizontalEnd,
            false,
            true
          );

          // Check vertical center line intersections
          const verticalStart = { x: centerX, y: topEdge };
          const verticalEnd = { x: centerX, y: bottomEdge };
          const verticalIntersections = findPolygonLineIntersections(
            objectToProcess,
            verticalStart,
            verticalEnd,
            true,
            true
          );

          // Process horizontal intersections (left and right walls)
          if (horizontalIntersections.length === 2) {
            // Process left wall intersection
            distance = horizontalIntersections[0].dist;
            if (dynamicGuides.wall_left == null || dynamicGuides.wall_left.distance > distance) {
              snapHit = new DynamicHit(
                objectToProcess.BlockID,
                null,
                textJustification.Center,
                distance,
                false,
                -1,
                true
              );
              snapHit.pt = horizontalIntersections[0].pt;
              dynamicGuides.wall_left = snapHit;
            }

            // Process right wall intersection
            distance = horizontalIntersections[1].dist;
            if (dynamicGuides.wall_right == null || dynamicGuides.wall_right.distance > distance) {
              snapHit = new DynamicHit(
                objectToProcess.BlockID,
                null,
                textJustification.Center,
                distance,
                false,
                -2,
                true
              );
              snapHit.pt = horizontalIntersections[1].pt;
              dynamicGuides.wall_right = snapHit;
            }
          }

          // Process vertical intersections (top and bottom walls)
          if (verticalIntersections.length === 2) {
            // Process top wall intersection
            distance = verticalIntersections[0].dist;
            if (dynamicGuides.wall_top == null || dynamicGuides.wall_top.distance > distance) {
              snapHit = new DynamicHit(
                objectToProcess.BlockID,
                null,
                textJustification.Center,
                distance,
                true,
                -1,
                true
              );
              snapHit.pt = verticalIntersections[0].pt;
              dynamicGuides.wall_top = snapHit;
            }

            // Process bottom wall intersection
            distance = verticalIntersections[1].dist;
            if (dynamicGuides.wall_bottom == null || dynamicGuides.wall_bottom.distance > distance) {
              snapHit = new DynamicHit(
                objectToProcess.BlockID,
                null,
                textJustification.Center,
                distance,
                true,
                -2,
                true
              );
              snapHit.pt = verticalIntersections[1].pt;
              dynamicGuides.wall_bottom = snapHit;
            }
          }
        }
      }

      // Process PolyWall or Room guide types
      if (guideDistanceType === OptConstant.GuideDistanceTypes.PolyWall ||
        guideDistanceType === OptConstant.GuideDistanceTypes.Room) {

        // Check if center Y is within bounds
        if (centerY >= topEdge && centerY <= bottomEdge) {
          const horizontalStart = { x: leftEdge, y: centerY };
          const horizontalEnd = { x: rightEdge, y: centerY };

          const horizontalIntersections = findPolygonLineIntersections(
            objectToProcess,
            horizontalStart,
            horizontalEnd,
            false,
            false
          );

          // Process horizontal intersections (left and right)
          if (horizontalIntersections.length === 2) {
            // Process left intersection if valid
            if (horizontalIntersections[0].pt != null) {
              distance = horizontalIntersections[0].dist;
              if (dynamicGuides.wall_left == null || dynamicGuides.wall_left.distance > distance) {
                snapHit = new DynamicHit(
                  objectToProcess.BlockID,
                  null,
                  textJustification.Center,
                  distance,
                  false,
                  -1,
                  true
                );
                snapHit.pt = horizontalIntersections[0].pt;
                dynamicGuides.wall_left = snapHit;
              }
            }

            // Process right intersection if valid
            if (horizontalIntersections[1].pt != null) {
              distance = horizontalIntersections[1].dist;
              if (dynamicGuides.wall_right == null || dynamicGuides.wall_right.distance > distance) {
                snapHit = new DynamicHit(
                  objectToProcess.BlockID,
                  null,
                  textJustification.Center,
                  distance,
                  false,
                  -2,
                  true
                );
                snapHit.pt = horizontalIntersections[1].pt;
                dynamicGuides.wall_right = snapHit;
              }
            }
          }
        }

        // Check if center X is within bounds
        if (centerX >= leftEdge && centerX <= rightEdge) {
          const verticalStart = { x: centerX, y: topEdge };
          const verticalEnd = { x: centerX, y: bottomEdge };

          const verticalIntersections = findPolygonLineIntersections(
            objectToProcess,
            verticalStart,
            verticalEnd,
            true,
            false
          );

          // Process vertical intersections (top and bottom)
          if (verticalIntersections.length === 2) {
            // Process top intersection if valid
            if (verticalIntersections[0].pt != null) {
              distance = verticalIntersections[0].dist;
              if (dynamicGuides.wall_top == null || dynamicGuides.wall_top.distance > distance) {
                snapHit = new DynamicHit(
                  objectToProcess.BlockID,
                  null,
                  textJustification.Center,
                  distance,
                  true,
                  -1,
                  true
                );
                snapHit.pt = verticalIntersections[0].pt;
                dynamicGuides.wall_top = snapHit;
              }
            }

            // Process bottom intersection if valid
            if (verticalIntersections[1].pt != null) {
              distance = verticalIntersections[1].dist;
              if (dynamicGuides.wall_bottom == null || dynamicGuides.wall_bottom.distance > distance) {
                snapHit = new DynamicHit(
                  objectToProcess.BlockID,
                  null,
                  textJustification.Center,
                  distance,
                  true,
                  -2,
                  true
                );
                snapHit.pt = verticalIntersections[1].pt;
                dynamicGuides.wall_bottom = snapHit;
              }
            }
          }
        }
      }
      // Process Vertical_Wall guide type
      else if (guideDistanceType === OptConstant.GuideDistanceTypes.Vertical_Wall) {
        let objectFrame = Utils1.DeepCopy(objectToProcess.Frame);
        const borderThickness = objectToProcess.StyleRecord.Line.BThick;

        // Adjust rectangle by border thickness horizontally only
        Utils2.InflateRect(objectFrame, -borderThickness, 0);

        // Check if object is at center Y level
        if (objectFrame.y <= centerY && objectFrame.y + objectFrame.height >= centerY) {
          // Object is to the right of selection
          if (objectBounds.x > objectFrame.x + objectFrame.width) {
            distance = objectBounds.x - (objectFrame.x + objectFrame.width);
            if (dynamicGuides.wall_left == null || dynamicGuides.wall_left.distance > distance) {
              snapHit = new DynamicHit(
                objectToProcess.BlockID,
                null,
                textJustification.Center,
                distance,
                false,
                -1,
                true
              );
              dynamicGuides.wall_left = snapHit;
            }
          }
          // Object is to the left of selection
          else if (rightEdge < objectFrame.x) {
            distance = objectFrame.x - rightEdge;
            if (dynamicGuides.wall_right == null || dynamicGuides.wall_right.distance > distance) {
              snapHit = new DynamicHit(
                objectToProcess.BlockID,
                null,
                textJustification.Center,
                distance,
                false,
                -2,
                true
              );
              dynamicGuides.wall_right = snapHit;
            }
          }
        }
      }
      // Process Horizontal_Wall guide type
      else if (guideDistanceType === OptConstant.GuideDistanceTypes.Horizontal_Wall) {
        let objectFrame = Utils1.DeepCopy(objectToProcess.Frame);
        const borderThickness = objectToProcess.StyleRecord.Line.BThick;

        // Adjust rectangle by border thickness vertically only
        Utils2.InflateRect(objectFrame, 0, -borderThickness);

        // Check if object is at center X level
        if (objectFrame.x <= centerX && objectFrame.x + objectFrame.width >= centerX) {
          // Object is below selection
          if (objectBounds.y > objectFrame.y + objectFrame.height) {
            distance = objectBounds.y - (objectFrame.y + objectFrame.height);
            snapHit = new DynamicHit(
              objectToProcess.BlockID,
              null,
              textJustification.Center,
              distance,
              true,
              -1,
              true
            );
            dynamicGuides.wall_top = snapHit;
          }
          // Object is above selection
          else if (bottomEdge < objectFrame.y) {
            distance = objectFrame.y - bottomEdge;
            snapHit = new DynamicHit(
              objectToProcess.BlockID,
              null,
              textJustification.Center,
              distance,
              true,
              -2,
              true
            );
            dynamicGuides.wall_bottom = snapHit;
          }
        }
      }
    };

    /**
     * Processes visible objects to create dynamic snap guides
     * @param selectedObject - The currently selected object
     * @param bounds - The bounding rectangle of the selected object
     * @param dynamicGuides - Collection of dynamic guides
     * @param snapDistance - Maximum distance to consider for snapping
     * @param includeCenters - Flag to include center points in snapping
     * @param restrictToVisible - Flag to restrict snapping to visible objects only
     * @returns Object containing snap coordinates for x and y axes
     */
    if (null != DataUtil.GetObjectPtr(selectedObject, false)) {
      let guideDistanceType;
      const rightEdge = bounds.x + bounds.width;
      const bottomEdge = bounds.y + bounds.height;
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      let distanceOnlyMode = false;
      if (snapDistance && snapDistance.distanceonly) {
        distanceOnlyMode = true;
      }

      // Iterate through all objects to find potential snap targets
      for (let objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        const currentObjectId = activeObjectsList[objectIndex];

        if (currentObjectId !== selectedObject && (!restrictToVisible /*|| restrictToVisible.indexOf(currentObjectId) >= 0*/)) {
          const objectToCheck = DataUtil.GetObjectPtr(currentObjectId, false);

          if (objectToCheck) {
            const targetRect = objectToCheck.GetSnapRect();
            const targetRight = targetRect.x + targetRect.width;
            const targetLeft = targetRect.x;
            const targetTop = targetRect.y;
            const targetBottom = targetRect.y + targetRect.height;
            const targetCenterX = targetRect.x + targetRect.width / 2;
            const targetCenterY = targetRect.y + targetRect.height / 2;

            guideDistanceType = objectToCheck.GuideDistanceOnly();

            // Process special wall and room guides if applicable
            if (guideDistanceType) {
              processWallAndRoomGuides(objectToCheck, bounds, guideDistanceType);
            }

            // Skip regular snapping if in distance-only mode
            if (objectToCheck && objectToCheck.IsSnapTarget() && !distanceOnlyMode) {
              // Left edge snap checks
              if (targetLeft >= bounds.x - 5 && targetLeft <= bounds.x + 5) {
                if (targetBottom < bounds.y) {
                  // Object above
                  distance = bounds.y - targetBottom;
                  createOrUpdateDynamicHit("above_left", currentObjectId, targetLeft, bounds.x, textJustification.Left, distance, true, true, true);
                } else if (targetTop > bottomEdge) {
                  // Object below
                  distance = targetTop - bottomEdge;
                  createOrUpdateDynamicHit("below_left", currentObjectId, targetLeft, bounds.x, textJustification.Left, distance, true, false, true);
                }
              }

              // Right-to-left edge snap checks
              if (targetRight >= bounds.x - 5 && targetRight <= bounds.x + 5) {
                if (targetBottom < bounds.y) {
                  // Object above
                  distance = bounds.y - targetBottom;
                  createOrUpdateDynamicHit("above_left", currentObjectId, targetRight, bounds.x, textJustification.Left, distance, true, true, true);
                } else if (targetTop > bottomEdge) {
                  // Object below
                  distance = targetTop - bottomEdge;
                  createOrUpdateDynamicHit("below_left", currentObjectId, targetRight, bounds.x, textJustification.Left, distance, true, false, true);
                }
              }

              // Right edge snap checks
              if (targetRight >= rightEdge - 5 && targetRight <= rightEdge + 5) {
                if (targetBottom < bounds.y) {
                  // Object above
                  distance = bounds.y - targetBottom;
                  createOrUpdateDynamicHit("above_right", currentObjectId, targetRight, rightEdge, textJustification.Right, distance, true, true, true);
                } else if (targetTop > bottomEdge) {
                  // Object below
                  distance = targetTop - bottomEdge;
                  createOrUpdateDynamicHit("below_right", currentObjectId, targetRight, rightEdge, textJustification.Right, distance, true, false, true);
                }
              }

              // Left-to-right edge snap checks
              if (targetLeft >= rightEdge - 5 && targetLeft <= rightEdge + 5) {
                if (targetBottom < bounds.y) {
                  // Object above
                  distance = bounds.y - targetBottom;
                  createOrUpdateDynamicHit("above_right", currentObjectId, targetLeft, rightEdge, textJustification.Right, distance, true, true, true);
                } else if (targetTop > bottomEdge) {
                  // Object below
                  distance = targetTop - bottomEdge;
                  createOrUpdateDynamicHit("below_right", currentObjectId, targetLeft, rightEdge, textJustification.Right, distance, true, false, true);
                }
              }

              // Top edge snap checks
              if (targetTop >= bounds.y - 5 && targetTop <= bounds.y + 5) {
                if (targetRight < bounds.x) {
                  // Object to the left
                  distance = bounds.x - targetRight;
                  createOrUpdateDynamicHit("left_top", currentObjectId, targetTop, bounds.y, textJustification.Top, distance, false, true, false);
                } else if (targetLeft > rightEdge) {
                  // Object to the right
                  distance = targetLeft - rightEdge;
                  createOrUpdateDynamicHit("right_top", currentObjectId, targetTop, bounds.y, textJustification.Top, distance, false, false, false);
                }
              }

              // Bottom-to-top edge snap checks
              if (targetBottom >= bounds.y - 5 && targetBottom <= bounds.y + 5) {
                if (targetRight < bounds.x) {
                  // Object to the left
                  distance = bounds.x - targetRight;
                  createOrUpdateDynamicHit("left_top", currentObjectId, targetBottom, bounds.y, textJustification.Top, distance, false, true, false);
                } else if (targetLeft > rightEdge) {
                  // Object to the right
                  distance = targetLeft - rightEdge;
                  createOrUpdateDynamicHit("right_top", currentObjectId, targetBottom, bounds.y, textJustification.Top, distance, false, false, false);
                }
              }

              // Bottom edge snap checks
              if (targetBottom >= bottomEdge - 5 && targetBottom <= bottomEdge + 5) {
                if (targetRight < bounds.x) {
                  // Object to the left
                  distance = bounds.x - targetRight;
                  createOrUpdateDynamicHit("left_bottom", currentObjectId, targetBottom, bottomEdge, textJustification.Bottom, distance, false, true, false);
                } else if (targetLeft > rightEdge) {
                  // Object to the right
                  distance = targetLeft - rightEdge;
                  createOrUpdateDynamicHit("right_bottom", currentObjectId, targetBottom, bottomEdge, textJustification.Bottom, distance, false, false, false);
                }
              }

              // Top-to-bottom edge snap checks
              if (targetTop >= bottomEdge - 5 && targetTop <= bottomEdge + 5) {
                if (targetRight < bounds.x) {
                  // Object to the left
                  distance = bounds.x - targetRight;
                  createOrUpdateDynamicHit("left_bottom", currentObjectId, targetTop, bottomEdge, textJustification.Bottom, distance, false, true, false);
                } else if (targetLeft > rightEdge) {
                  // Object to the right
                  distance = targetLeft - rightEdge;
                  createOrUpdateDynamicHit("right_bottom", currentObjectId, targetTop, bottomEdge, textJustification.Bottom, distance, false, false, false);
                }
              }

              // Center horizontal alignment
              if (targetCenterX >= centerX - 5 && targetCenterX <= centerX + 5) {
                if (targetBottom < bounds.y) {
                  // Object above
                  distance = bounds.y - targetBottom;
                  createOrUpdateDynamicHit("above_center", currentObjectId, targetCenterX, centerX, textJustification.Center, distance, true, true, true);
                } else if (targetTop > bottomEdge) {
                  // Object below
                  distance = targetTop - bottomEdge;
                  createOrUpdateDynamicHit("below_center", currentObjectId, targetCenterX, centerX, textJustification.Center, distance, true, false, true);
                }
              }

              // Center vertical alignment
              if (targetCenterY >= centerY - 5 && targetCenterY <= centerY + 5) {
                if (targetRight < bounds.x) {
                  // Object to the left
                  distance = bounds.x - targetRight;
                  createOrUpdateDynamicHit("left_center", currentObjectId, targetCenterY, centerY, textJustification.Center, distance, false, true, false);
                } else if (targetLeft > rightEdge) {
                  // Object to the right
                  distance = targetLeft - rightEdge;
                  createOrUpdateDynamicHit("right_center", currentObjectId, targetCenterY, centerY, textJustification.Center, distance, false, false, false);
                }
              }
            }
          }
        }
      }

      // Process final snap calculations and finalize guides
      let guideKey;
      const snapValues = {
        x: null,
        y: null
      };
      const offsetValues = {
        x: 0,
        y: 0
      };

      // Process center snapping options
      if (includeCenters) {
        let hitCount, hitIndex;
        const centerCount = includeCenters.length;

        // Apply primary snap values from included centers
        for (hitIndex = 0; hitIndex < centerCount; hitIndex++) {
          guideKey = includeCenters[hitIndex];
          const dynamicHit = dynamicGuides[guideKey];

          if (dynamicHit) {
            if (dynamicHit.leftright) {
              snapValues.x = dynamicHit.snap;
              offsetValues.x = dynamicHit.snap;
            } else {
              snapValues.y = dynamicHit.snap;
              offsetValues.y = dynamicHit.snap;
            }
          }
        }

        // Adjust other snaps based on center snapping
        for (guideKey in dynamicGuides) {
          const dynamicHit = dynamicGuides[guideKey];

          if (dynamicHit != null && includeCenters.indexOf(guideKey) < 0) {
            if (dynamicHit.leftright) {
              if (guideKey === "above_center" || guideKey === "below_center") {
                if (includeCenters.indexOf("above_right") >= 0 || includeCenters.indexOf("below_right") >= 0) {
                  dynamicHit.snap -= offsetValues.x / 2;
                  for (hitCount = dynamicHit.otherhits.length, hitIndex = 0; hitIndex < hitCount; hitIndex++) {
                    dynamicHit.otherhits[hitIndex].snap -= offsetValues.x / 2;
                  }
                } else if (includeCenters.indexOf("above_left") >= 0 || includeCenters.indexOf("below_left") >= 0) {
                  dynamicHit.snap += -offsetValues.x / 2;
                  for (hitCount = dynamicHit.otherhits.length, hitIndex = 0; hitIndex < hitCount; hitIndex++) {
                    dynamicHit.otherhits[hitIndex].snap += -offsetValues.x / 2;
                  }
                }
              }

              if (!Utils2.IsEqual(dynamicHit.snap, 0, 0.5)) {
                dynamicGuides[guideKey] = null;
              }
            } else {
              if (guideKey === "left_center" || guideKey === "right_center") {
                if (includeCenters.indexOf("left_bottom") >= 0 || includeCenters.indexOf("right_bottom") >= 0) {
                  dynamicHit.snap -= offsetValues.y / 2;
                  for (hitCount = dynamicHit.otherhits.length, hitIndex = 0; hitIndex < hitCount; hitIndex++) {
                    dynamicHit.otherhits[hitIndex].snap -= offsetValues.y / 2;
                  }
                } else if (includeCenters.indexOf("left_top") >= 0 || includeCenters.indexOf("right_top") >= 0) {
                  dynamicHit.snap += -offsetValues.y / 2;
                  for (hitCount = dynamicHit.otherhits.length, hitIndex = 0; hitIndex < hitCount; hitIndex++) {
                    dynamicHit.otherhits[hitIndex].snap += -offsetValues.y / 2;
                  }
                }
              }

              if (!Utils2.IsEqual(dynamicHit.snap, 0, 0.5)) {
                dynamicGuides[guideKey] = null;
              }
            }
          }
        }

        // Process and finalize guides
        for (guideKey in dynamicGuides) {
          const dynamicHit = dynamicGuides[guideKey];
          if (dynamicHit != null) {
            markAsLabel(dynamicHit);
            processDynamicHitOtherHits(dynamicHit);
          }
        }
      } else {
        // Handle automatic center snap mode
        const bestCenterSnaps = {
          x: null,
          y: null
        };

        if (T3Gv.docUtil.docConfig.centerSnap) {
          const centerGuides = ["above_center", "below_center", "left_center", "right_center"];

          for (objectCount = centerGuides.length, objectIndex = 0; objectIndex < objectCount; objectIndex++) {
            guideKey = centerGuides[objectIndex];
            const dynamicHit = dynamicGuides[guideKey];

            if (dynamicHit != null && dynamicHit.snap != null) {
              if (dynamicHit.leftright) {
                if (bestCenterSnaps.x == null || Math.abs(dynamicHit.snap) < Math.abs(bestCenterSnaps.x)) {
                  bestCenterSnaps.x = dynamicHit.snap;
                  snapValues.x = dynamicHit.snap;
                }
              } else {
                if (bestCenterSnaps.y == null || Math.abs(dynamicHit.snap) < Math.abs(bestCenterSnaps.x)) {
                  bestCenterSnaps.y = dynamicHit.snap;
                  snapValues.y = dynamicHit.snap;
                }
              }
            }
          }
        }

        // Find best snap values for non-center guides
        for (guideKey in dynamicGuides) {
          const dynamicHit = dynamicGuides[guideKey];

          if (dynamicHit != null && dynamicHit.snap != null) {
            if (dynamicHit.leftright && bestCenterSnaps.x == null) {
              if (snapValues.x == null || Math.abs(dynamicHit.snap) < Math.abs(snapValues.x)) {
                snapValues.x = dynamicHit.snap;
              }
            } else if (bestCenterSnaps.y == null) {
              if (snapValues.y == null || Math.abs(dynamicHit.snap) < Math.abs(snapValues.y)) {
                snapValues.y = dynamicHit.snap;
              }
            }
          }

          // Handle special wall guide cases
          switch (guideKey) {
            case "wall_left":
              if (dynamicGuides.left_center) {
                dynamicGuides[guideKey] = null;
              }
              break;
            case "wall_right":
              if (dynamicGuides.right_center) {
                dynamicGuides[guideKey] = null;
              }
              break;
            case "wall_top":
              if (dynamicGuides.above_center) {
                dynamicGuides[guideKey] = null;
              }
              break;
            case "wall_bottom":
              if (dynamicGuides.below_center) {
                dynamicGuides[guideKey] = null;
              }
              break;
          }
        }

        // Filter guides based on best snap values
        for (guideKey in dynamicGuides) {
          const dynamicHit = dynamicGuides[guideKey];

          if (dynamicHit != null && dynamicHit.snap != null) {
            if (dynamicHit.leftright) {
              if (snapValues.x != null && !Utils2.IsEqual(dynamicHit.snap, snapValues.x, 0.5)) {
                dynamicGuides[guideKey] = null;
              }
            } else {
              if (snapValues.y != null && !Utils2.IsEqual(dynamicHit.snap, snapValues.y, 0.5)) {
                dynamicGuides[guideKey] = null;
              }
            }
          }
        }

        // Process and finalize remaining guides
        for (guideKey in dynamicGuides) {
          const dynamicHit = dynamicGuides[guideKey];
          if (dynamicHit != null) {
            markAsLabel(dynamicHit);
            processDynamicHitOtherHits(dynamicHit);
          }
        }
      }

      return snapValues;
    }

  }

  /**
   * Updates dynamic snap guides in the SVG highlight layer
   * @param guides - Collection of dynamic guide objects
   * @param objectId - ID of the target object
   * @param bounds - Rectangle bounds of the object
   * @description This function updates visual guides that appear when snapping objects.
   * It creates or updates line elements and labels in the SVG highlight layer to show
   * alignment distances and positions.
   */
  static DynamicSnapsUpdateGuides(guides, objectId, bounds) {
    if (null != DataUtil.GetObjectPtr(objectId, !1)) {
      let guideKey, targetRect, bottomEdge, rightEdge, centerX, centerY;
      const existingGuides = T3Gv.opt.dynamicGuides;
      const textJustification = TextConstant.TextJust;

      bottomEdge = bounds.y + bounds.height;
      rightEdge = bounds.x + bounds.width;
      centerX = bounds.x + bounds.width / 2;
      centerY = bounds.y + bounds.height / 2;

      const labelPosition = {
        x: 0,
        y: 0
      };

      const sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, !1);
      const guideColor = "#2C75F9";
      const fontStyle = Utils1.DeepCopy(T3Gv.opt.header.DimensionFontStyle);
      fontStyle.color = guideColor;

      const docToScreenScale = T3Gv.opt.svgDoc.docInfo.docToScreenScale;
      fontStyle.size /= docToScreenScale;

      /**
       * Removes guide elements from the SVG layer
       * @param elementId - The ID of the guide element to remove
       */
      const removeGuideElements = function (elementId) {
        const labelId = elementId + "label";
        const backgroundId = elementId + "back";

        const guideElement = T3Gv.opt.svgHighlightLayer.GetElementById(elementId);
        const labelElement = T3Gv.opt.svgHighlightLayer.GetElementById(labelId);
        const backgroundElement = T3Gv.opt.svgHighlightLayer.GetElementById(backgroundId);

        if (guideElement) T3Gv.opt.svgHighlightLayer.RemoveElement(guideElement);
        if (labelElement) T3Gv.opt.svgHighlightLayer.RemoveElement(labelElement);
        if (backgroundElement) T3Gv.opt.svgHighlightLayer.RemoveElement(backgroundElement);
      };

      /**
       * Updates or creates a guide for a specific hit
       * @param hit - The hit object containing snap information
       * @param elementId - The ID to use for the guide element
       */
      const updateGuideElement = function (hit, elementId) {
        const targetObject = DataUtil.GetObjectPtr(hit.ID, !1);

        if (null != targetObject) {
          let startPoint, endPoint, horizontalPosition;
          const targetBounds = targetObject.GetSnapRect();
          const targetBottom = targetBounds.y + targetBounds.height;
          const targetRight = targetBounds.x + targetBounds.width;

          const lineScale = 1 / T3Gv.opt.svgDoc.GetWorkArea().docScale;
          const linePattern = 3 * lineScale + "," + 6 * lineScale;
          const centerPattern = 12 * lineScale + "," + 6 * lineScale;

          let textElement, labelText;
          let guideElement = T3Gv.opt.svgHighlightLayer.GetElementById(elementId);
          let isCenterGuide = false;
          let displayText = null;

          // Set guide positions and text based on edge and direction
          if (hit.leftright) {
            if (hit.edge === textJustification.Left) {
              if (hit.label) {
                displayText = RulerUtil.GetLengthInRulerUnits(hit.distance, !1, 0, 0);
                labelPosition.x = bounds.x;
              }

              if (hit.aboveleft) {
                if (null != hit.pt) {
                  startPoint = { x: bounds.x, y: hit.pt.y };
                  endPoint = { x: bounds.x, y: targetBounds.y };
                  labelPosition.y = hit.pt.y - hit.distance / 2;
                } else {
                  startPoint = { x: bounds.x, y: bottomEdge };
                  endPoint = { x: bounds.x, y: targetBounds.y };
                  labelPosition.y = bounds.y - hit.distance / 2;
                }
              } else {
                if (null != hit.pt) {
                  startPoint = { x: bounds.x, y: hit.pt.y };
                  endPoint = { x: bounds.x, y: targetBottom };
                  labelPosition.y = hit.pt.y + hit.distance / 2;
                } else {
                  horizontalPosition = guides.above_left ? bottomEdge : bounds.y;
                  startPoint = { x: bounds.x, y: horizontalPosition };
                  endPoint = { x: bounds.x, y: targetBottom };
                  labelPosition.y = bottomEdge + hit.distance / 2;
                }
              }
            } else if (hit.edge === textJustification.Right) {
              if (hit.label) {
                displayText = RulerUtil.GetLengthInRulerUnits(hit.distance, !1, 0, 0);
                labelPosition.x = rightEdge;
              }

              if (hit.aboveleft) {
                if (null != hit.pt) {
                  startPoint = { x: rightEdge, y: hit.pt.y };
                  endPoint = { x: rightEdge, y: targetBounds.y };
                  labelPosition.y = hit.pt.y - hit.distance / 2;
                } else {
                  startPoint = { x: rightEdge, y: bottomEdge };
                  endPoint = { x: rightEdge, y: targetBounds.y };
                  labelPosition.y = bounds.y - hit.distance / 2;
                }
              } else {
                if (null != hit.pt) {
                  startPoint = { x: rightEdge, y: hit.pt.y };
                  endPoint = { x: rightEdge, y: targetBottom };
                  labelPosition.y = hit.pt.y + hit.distance / 2;
                } else {
                  horizontalPosition = guides.above_left ? bottomEdge : bounds.y;
                  startPoint = { x: rightEdge, y: horizontalPosition };
                  endPoint = { x: rightEdge, y: targetBottom };
                  labelPosition.y = bottomEdge + hit.distance / 2;
                }
              }
            } else if (hit.edge === textJustification.Center) {
              isCenterGuide = true;
              labelPosition.x = centerX;

              if (hit.aboveleft === -1) {
                if (null != hit.pt) {
                  startPoint = { x: centerX, y: bounds.y };
                  endPoint = { x: centerX, y: hit.pt.y };
                } else {
                  startPoint = { x: centerX, y: bounds.y };
                  endPoint = { x: centerX, y: targetBounds.y };
                }
                labelPosition.y = bounds.y - hit.distance / 2;
              } else if (hit.aboveleft === -2) {
                if (null != hit.pt) {
                  startPoint = { x: centerX, y: bottomEdge };
                  endPoint = { x: centerX, y: hit.pt.y };
                } else {
                  startPoint = { x: centerX, y: bottomEdge };
                  endPoint = { x: centerX, y: targetBottom };
                }
                labelPosition.y = bottomEdge + hit.distance / 2;
              } else if (hit.aboveleft) {
                if (null != hit.pt) {
                  startPoint = { x: centerX, y: hit.pt.y };
                  endPoint = { x: centerX, y: targetBottom };
                  labelPosition.y = hit.pt.y - hit.distance / 2;
                } else {
                  startPoint = { x: centerX, y: bounds.y };
                  endPoint = { x: centerX, y: targetBottom };
                  labelPosition.y = bounds.y - hit.distance / 2;
                }
              } else {
                if (null != hit.pt) {
                  startPoint = { x: centerX, y: hit.pt.y };
                  endPoint = { x: centerX, y: targetBounds.y };
                  labelPosition.y = hit.pt.y + hit.distance / 2;
                } else {
                  startPoint = { x: centerX, y: bottomEdge };
                  endPoint = { x: centerX, y: targetBounds.y };
                  labelPosition.y = bottomEdge + hit.distance / 2;
                }
              }
              displayText = RulerUtil.GetLengthInRulerUnits(hit.distance, !1, 0, 0);
            }
          } else {
            if (hit.edge === textJustification.Top) {
              if (hit.label) {
                displayText = RulerUtil.GetLengthInRulerUnits(hit.distance, !1, 0, 0);
                labelPosition.y = bounds.y;
              }

              if (hit.aboveleft) {
                if (null != hit.pt) {
                  startPoint = { x: hit.pt.x, y: bounds.y };
                  endPoint = { x: targetBounds.x, y: bounds.y };
                  labelPosition.x = hit.pt.x - hit.distance / 2;
                } else {
                  startPoint = { x: rightEdge, y: bounds.y };
                  endPoint = { x: targetBounds.x, y: bounds.y };
                  labelPosition.x = bounds.x - hit.distance / 2;
                }
              } else {
                if (null != hit.pt) {
                  startPoint = { x: hit.pt.x, y: bounds.y };
                  endPoint = { x: targetRight, y: bounds.y };
                  labelPosition.x = hit.pt.x + hit.distance / 2;
                } else {
                  horizontalPosition = guides.left_top ? rightEdge : bounds.x;
                  startPoint = { x: horizontalPosition, y: bounds.y };
                  endPoint = { x: targetRight, y: bounds.y };
                  labelPosition.x = rightEdge + hit.distance / 2;
                }
              }
            } else if (hit.edge === textJustification.Bottom) {
              if (hit.label) {
                displayText = RulerUtil.GetLengthInRulerUnits(hit.distance, !1, 0, 0);
                labelPosition.y = bottomEdge;
              }

              if (hit.aboveleft) {
                if (null != hit.pt) {
                  startPoint = { x: hit.pt.x, y: bottomEdge };
                  endPoint = { x: targetBounds.x, y: bottomEdge };
                  labelPosition.x = hit.pt.x - hit.distance / 2;
                } else {
                  startPoint = { x: rightEdge, y: bottomEdge };
                  endPoint = { x: targetBounds.x, y: bottomEdge };
                  labelPosition.x = bounds.x - hit.distance / 2;
                }
              } else {
                if (null != hit.pt) {
                  startPoint = { x: hit.pt.x, y: bottomEdge };
                  endPoint = { x: targetRight, y: bottomEdge };
                  labelPosition.x = hit.pt.x + hit.distance / 2;
                } else {
                  horizontalPosition = guides.left_bottom ? rightEdge : bounds.x;
                  startPoint = { x: horizontalPosition, y: bottomEdge };
                  endPoint = { x: targetRight, y: bottomEdge };
                  labelPosition.x = rightEdge + hit.distance / 2;
                }
              }
            } else if (hit.edge === textJustification.Center) {
              isCenterGuide = true;
              labelPosition.y = centerY;

              if (hit.aboveleft === -1) {
                if (null != hit.pt) {
                  startPoint = { x: bounds.x, y: centerY };
                  endPoint = { x: hit.pt.x, y: centerY };
                } else {
                  startPoint = { x: bounds.x, y: centerY };
                  endPoint = { x: targetBounds.x, y: centerY };
                }
                labelPosition.x = bounds.x - hit.distance / 2;
              } else if (hit.aboveleft === -2) {
                if (null != hit.pt) {
                  startPoint = { x: rightEdge, y: centerY };
                  endPoint = { x: hit.pt.x, y: centerY };
                } else {
                  startPoint = { x: rightEdge, y: centerY };
                  endPoint = { x: targetRight, y: centerY };
                }
                labelPosition.x = rightEdge + hit.distance / 2;
              } else if (hit.aboveleft) {
                if (null != hit.pt) {
                  startPoint = { x: hit.pt.x, y: centerY };
                  endPoint = { x: targetRight, y: centerY };
                  labelPosition.x = hit.pt.x - hit.distance / 2;
                } else {
                  startPoint = { x: bounds.x, y: centerY };
                  endPoint = { x: targetRight, y: centerY };
                  labelPosition.x = bounds.x - hit.distance / 2;
                }
              } else {
                if (null != hit.pt) {
                  startPoint = { x: hit.pt.x, y: centerY };
                  endPoint = { x: targetBounds.x, y: centerY };
                  labelPosition.x = hit.pt.x + hit.distance / 2;
                } else {
                  startPoint = { x: rightEdge, y: centerY };
                  endPoint = { x: targetBounds.x, y: centerY };
                  labelPosition.x = rightEdge + hit.distance / 2;
                }
              }
              displayText = RulerUtil.GetLengthInRulerUnits(hit.distance, !1, 0, 0);
            }
          }

          if (startPoint) {
            // Create or update guide line
            if (guideElement == null) {
              guideElement = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Line);
              guideElement.SetFillColor("none");
              guideElement.SetStrokeColor(guideColor);
              guideElement.SetStrokeWidth(lineScale);
              guideElement.SetStrokePattern(isCenterGuide ? centerPattern : linePattern);
              guideElement.SetID(elementId);
              T3Gv.opt.svgHighlightLayer.AddElement(guideElement);
            }

            guideElement.SetPoints(startPoint.x, startPoint.y, endPoint.x, endPoint.y);

            const labelId = elementId + "label";
            const backgroundId = elementId + "back";

            // Create or update label text
            if (displayText) {
              textElement = T3Gv.opt.svgHighlightLayer.GetElementById(labelId);
              let backgroundElement = T3Gv.opt.svgHighlightLayer.GetElementById(backgroundId);

              if (textElement == null) {
                // Create background for text
                backgroundElement = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Rect);
                backgroundElement.SetID(backgroundId);
                backgroundElement.SetStrokeWidth(0);

                const backgroundColor = sessionBlock.background.Paint.Color;
                backgroundElement.SetFillColor(backgroundColor);
                T3Gv.opt.svgHighlightLayer.AddElement(backgroundElement);

                // Create text element
                textElement = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);
                T3Gv.opt.svgHighlightLayer.AddElement(textElement);
                textElement.SetID(labelId);
                textElement.SetRenderingEnabled(false);
                textElement.SetText(displayText);
                textElement.SetFormat(fontStyle);
              } else {
                textElement.SetRenderingEnabled(false);
                textElement.SetText(displayText);
              }

              textElement.SetRenderingEnabled(true);

              // Position text and background
              const textDimensions = textElement.GetTextMinDimensions();
              backgroundElement.SetPos(
                labelPosition.x - textDimensions.width / 2 - 2,
                labelPosition.y - textDimensions.height / 2 - 2
              );
              backgroundElement.SetSize(
                textDimensions.width + 4,
                textDimensions.height + 4
              );
              textElement.SetPos(
                labelPosition.x - textDimensions.width / 2,
                labelPosition.y - textDimensions.height / 2
              );
            } else {
              // Remove text and background if no text to display
              textElement = T3Gv.opt.svgHighlightLayer.GetElementById(labelId);
              const backgroundElement = T3Gv.opt.svgHighlightLayer.GetElementById(backgroundId);

              if (textElement) T3Gv.opt.svgHighlightLayer.RemoveElement(textElement);
              if (backgroundElement) T3Gv.opt.svgHighlightLayer.RemoveElement(backgroundElement);
            }
          }
        }
      };

      // Process all guides
      for (guideKey in guides) {
        let guideIndex, guideCount, otherHit;
        const processedIds = [];

        if (null != guides[guideKey]) {
          // Process main guide
          updateGuideElement(guides[guideKey], guideKey);

          // Process other hits associated with this guide
          guideCount = guides[guideKey].otherhits.length;
          for (guideIndex = 0; guideIndex < guideCount; guideIndex++) {
            otherHit = guides[guideKey].otherhits[guideIndex];
            otherHit.label = guides[guideKey].label;
            processedIds.push(otherHit.ID);
            updateGuideElement(
              guides[guideKey].otherhits[guideIndex],
              guideKey + otherHit.ID.toString()
            );
          }

          // Clean up existing guides that are no longer needed
          if (existingGuides && null != existingGuides[guideKey]) {
            guideCount = existingGuides[guideKey].otherhits.length;
            for (guideIndex = 0; guideIndex < guideCount; guideIndex++) {
              otherHit = existingGuides[guideKey].otherhits[guideIndex];
              if (processedIds.indexOf(otherHit.ID) < 0) {
                removeGuideElements(guideKey + otherHit.ID.toString());
              }
            }
          }
        } else if (existingGuides && null != existingGuides[guideKey]) {
          // Remove guide if it no longer exists
          removeGuideElements(guideKey);

          if (existingGuides[guideKey].otherhits) {
            guideCount = existingGuides[guideKey].otherhits.length;
            for (guideIndex = 0; guideIndex < guideCount; guideIndex++) {
              otherHit = existingGuides[guideKey].otherhits[guideIndex];
              removeGuideElements(guideKey + otherHit.ID.toString());
            }
          }
        }
      }

      // Store current guides for later reference
      T3Gv.opt.dynamicGuides = guides;
    }
  }

  /**
   * Removes dynamic snap guides from the SVG highlight layer
   * @param guides - The dynamic snap guides to remove
   * @description This function removes all guide elements, labels, and backgrounds from the SVG highlight layer.
   * It processes both main guides and their associated "otherhits" elements.
   */
  static DynamicSnapsRemoveGuides(guides) {
    let guideKey, numberOfOtherHits, otherHitIndex, otherHit;

    if (guides) {
      for (guideKey in guides) {
        if (guides[guideKey]) {
          // Create IDs for related elements
          const labelId = guideKey + "label";
          const backgroundId = guideKey + "back";

          // Get elements from SVG highlight layer
          const guideElement = T3Gv.opt.svgHighlightLayer.GetElementById(guideKey);
          const labelElement = T3Gv.opt.svgHighlightLayer.GetElementById(labelId);
          const backgroundElement = T3Gv.opt.svgHighlightLayer.GetElementById(backgroundId);

          // Remove main guide elements if they exist
          if (guideElement) T3Gv.opt.svgHighlightLayer.RemoveElement(guideElement);
          if (labelElement) T3Gv.opt.svgHighlightLayer.RemoveElement(labelElement);
          if (backgroundElement) T3Gv.opt.svgHighlightLayer.RemoveElement(backgroundElement);

          // Process other hits if present
          if (guides[guideKey].otherhits) {
            numberOfOtherHits = guides[guideKey].otherhits.length;

            for (otherHitIndex = 0; otherHitIndex < numberOfOtherHits; otherHitIndex++) {
              otherHit = guides[guideKey].otherhits[otherHitIndex];

              // Create IDs for other hit elements
              const otherHitLabelId = guideKey + otherHit.ID.toString() + "label";
              const otherHitBackgroundId = guideKey + otherHit.ID.toString() + "back";

              // Get other hit elements
              const otherHitElement = T3Gv.opt.svgHighlightLayer.GetElementById(guideKey + otherHit.ID.toString());
              const otherHitLabelElement = T3Gv.opt.svgHighlightLayer.GetElementById(otherHitLabelId);
              const otherHitBackgroundElement = T3Gv.opt.svgHighlightLayer.GetElementById(otherHitBackgroundId);

              // Remove other hit elements if they exist
              if (otherHitElement) T3Gv.opt.svgHighlightLayer.RemoveElement(otherHitElement);
              if (otherHitLabelElement) T3Gv.opt.svgHighlightLayer.RemoveElement(otherHitLabelElement);
              if (otherHitBackgroundElement) T3Gv.opt.svgHighlightLayer.RemoveElement(otherHitBackgroundElement);
            }
          }
        }
      }
    }

    // Clean up guides reference
    guides = null;
  }
}

export default DynamicUtil
