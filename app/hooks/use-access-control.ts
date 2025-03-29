import { useEffect, useState } from "react";
import { accessControl, AccessLevel } from "../services/access-control";

export function useAccessControl() {
  const [currentLevel, setCurrentLevel] = useState<AccessLevel["level"]>(() =>
    accessControl.getCurrentLevel(),
  );
  const [limits, setLimits] = useState(accessControl.getCurrentLimits());

  useEffect(() => {
    // Update access level when component mounts
    accessControl.updateAccessLevel();
    setCurrentLevel(() => accessControl.getCurrentLevel());
    setLimits(accessControl.getCurrentLimits());
  }, []);

  const updateAccessLevel = () => {
    accessControl.updateAccessLevel();
    setCurrentLevel(() => accessControl.getCurrentLevel());
    setLimits(accessControl.getCurrentLimits());
  };

  return {
    currentLevel,
    limits,
    canAccessFeature: accessControl.canAccessFeature.bind(accessControl),
    isLimitExceeded: accessControl.isLimitExceeded.bind(accessControl),
    getRemainingLimit: accessControl.getRemainingLimit.bind(accessControl),
    updateAccessLevel,
  };
}
