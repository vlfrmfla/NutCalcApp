class Adjustment {
  constructor() {
    this.boundaries = {
      K: [3.0, 4.0, 7.1, 9.0],
      Ca: [3.0, 4.0, 7.1, 9.0],
      Mg: [1.5, 2.33, 3.17, 4.0],
      NO3: [6.0, 8.0, 16.1, 18.0],
      SO4: [1.5, 2.33, 3.17, 4.0], 
      PO4: [0.30, 0.60, 1.21, 1.75]
    };

    this.macroAdjustments = {
      // NH4: [0, 0, 0, 0],
      K: [1.25, 0.625, 0, -0.625, -1.25],
      Ca: [0.75, 0.375, 0, -0.375, -0.75],
      Mg: [0.2, 0.1, 0, -0.1, 0.2],
      NO3: [2.25, 1.125, 0, -1.125, -2.25],
      SO4: [0.25, 0.125, 0, -0.125, -0.25],
      PO4: [0.25, 0.125, 0, -0.125, -0.25]
    };

    this.microBoundaries = {
      Fe: [15.0, 20.0, 35.1, 50.0],
      Mn: [1.0, 4.1, 6.0],
      Zn: [2.0, 3.0, 5.1, 8.8],
      B: [5, 10, 26, 30],
      Cu: [0.30, 0.50, 3.01, 4.0]
    };

    this.microAdjustments = {
      Fe: [50, 25, 0, -25, -50],
      Mn: [50, 25, 0, -25, -50],
      Zn: [50, 25, 0, -25, -50],
      B: [50, 25, 0, -25, -50],
      Cu: [50, 25, 0, -25, -50]
    };

  }

  getAdjustmentLevel(boundary, value) {
    let level = boundary.findIndex(bound => value < bound);
    return level === -1 ? boundary.length : level;
  }

  calculateMacroDrainAdjustment(drainCorrection, targetDrain) {
    let corrections = {};
    for (const nutrient of Object.keys(this.boundaries)) {
      if (drainCorrection[nutrient] !== undefined && targetDrain[nutrient] !== undefined) {
        let currentLevel = drainCorrection[nutrient];
        let targetLevel = targetDrain[nutrient];
        let boundary = this.boundaries[nutrient];
        let macroAdjustment = this.macroAdjustments[nutrient];
        
        let currentAdjustmentLevel = this.getAdjustmentLevel(boundary, currentLevel);
        let targetAdjustmentLevel = this.getAdjustmentLevel(boundary, targetLevel);
        
        // 실제로 조정해야 할 인덱스를 계산
        let adjustmentIndex = currentAdjustmentLevel - targetAdjustmentLevel + 2;
        // 배열 범위 내로 인덱스를 제한
        adjustmentIndex = Math.max(0, Math.min(adjustmentIndex, macroAdjustment.length - 1));
        corrections[nutrient] = macroAdjustment[adjustmentIndex];
      }
    }

    const kCaRatio = drainCorrection['K'] / drainCorrection['Ca'];
    if (kCaRatio < 1.5) {
      corrections['K'] = (corrections['K'] || 0) + 0.25; // K 증가
      corrections['Ca'] = (corrections['Ca'] || 0) - 0.125; // Ca 감소
    } else if (kCaRatio > 1.5) {
      corrections['K'] = (corrections['K'] || 0) - 0.5; // K 감소
      corrections['Ca'] = (corrections['Ca'] || 0) + 0.25; // Ca 증가
    }     // 비율이 정확히 1.5일 경우 변경 x

    return corrections; 
  }

  calculateNH4adjust(drainCorrection, targetDrain) {
    let extraNH4 = 0;
    const { NH4, HCO3 } = drainCorrection;
    const { pH } = targetDrain

    if (pH >= 5.5 && HCO3 < 0.5) {
      extraNH4 = 0.4
    } else if (pH >= 5 && NH4 < 0.5 && HCO3 >= 0.5 && HCO3 < 1) {
      extraNH4 = 0.6
    } else if (pH >= 5 && pH < 6 && NH4 < 0.5 && HCO3 > 1) {
      extraNH4 = 0.4
    } else if (pH >= 6 && NH4 < 0.5 && HCO3 > 1) {
      extraNH4 = 0.8
    } 
    return extraNH4  
  }

  calculateMicroDrainAdjustment(drainCorrection, targetDrain, nutrientSolution) {
    let corrections = {};
    for (const nutrient of Object.keys(this.microBoundaries)) {
      if (drainCorrection[nutrient] !== undefined && targetDrain[nutrient] !== undefined) {
        let currentLevel = drainCorrection[nutrient];
        let targetLevel = targetDrain[nutrient];
        let boundary = this.microBoundaries[nutrient];
        let microAdjustment = this.microAdjustments[nutrient];
        
        let currentAdjustmentLevel = this.getAdjustmentLevel(boundary, currentLevel);
        let targetAdjustmentLevel = this.getAdjustmentLevel(boundary, targetLevel);
        
        let adjustmentIndex = currentAdjustmentLevel - targetAdjustmentLevel + 2;

        if(adjustmentIndex < microAdjustment.length) {
          let percentChange = microAdjustment[adjustmentIndex];
          if (nutrientSolution[nutrient] !== undefined) {
            let actualAdjustment = nutrientSolution[nutrient] * (percentChange / 100);
            corrections[nutrient] = actualAdjustment;
          } else {
            corrections[nutrient] = 0;
          }
        }
      }
    }

    return corrections;
  }
    
    calculateTotalAdjustment(drainCorrection, targetDrain, nutrientSolution) {
      const macroCorrections = this.calculateMacroDrainAdjustment(drainCorrection, targetDrain);
      const microCorrections = this.calculateMicroDrainAdjustment(drainCorrection, targetDrain, nutrientSolution);
      const extraNH4 = this.calculateNH4adjust(drainCorrection, targetDrain);
      
      // 'NH4' 수정값을 macroCorrections에 추가합니다.
      if (macroCorrections.hasOwnProperty('NH4')) {
        macroCorrections['NH4'] += extraNH4;
      } else {
        macroCorrections['NH4'] = extraNH4; // 만약 'NH4'가 macroCorrections에 없다면 새로운 속성으로 추가합니다.
      }
      
      const totalCorrections = { ...macroCorrections, ...microCorrections };
      return totalCorrections;
    }
}        
