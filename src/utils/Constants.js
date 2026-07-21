// Hằng số cấu hình cho Thái Bình Rush Code viet anh sửa start

export const GAME_STATES = {
  LOADING: 'LOADING',
  MENU: 'MENU',
  VIEWER: 'VIEWER',
  PLAYING: 'PLAYING',
  FEVER: 'FEVER',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

export const LANE = {
  LEFT: -3,
  CENTER: 0,
  RIGHT: 3,
  WIDTH: 3,
  COUNT: 3,
  SWITCH_SPEED: 15 // Tốc độ nội suy chuyển làn (lerp factor)
};

export const PHYSICS = {
  GRAVITY: 32,          // Gia tốc trọng trường (m/s^2)
  JUMP_FORCE: 14.5,     // Lực nhảy ban đầu thường
  HIGH_JUMP_FORCE: 23.0,// Lực nhảy siêu cao (vượt qua xe buýt Hà Nội 3.4m)
  SLIDE_DURATION: 800,  // Thời gian trượt (ms)
  PLAYER_GROUND_Y: 0    // Độ cao mặt đất mặc định của nhân vật
};

export const GAME_CONFIG = {
  BASE_SPEED: 15,       // Tốc độ di chuyển ban đầu (m/s)
  SPEED_INCREMENT: 1.5, // Mỗi mốc tăng bao nhiêu tốc độ
  COFFEES_PER_TIER: 10, // Số cà phê cần nhặt để tăng 1 cấp tốc độ
  MAX_SPEED: 35,        // Tốc độ giới hạn tối đa
  FEVER_SPEED_MULTIPLIER: 1.5, // Hệ số nhân tốc độ khi Fever Mode
  FEVER_DURATION: 7000,  // Thời gian Fever Mode (ms)

  // Tầm nhìn camera và môi trường
  CAMERA_FOV: 60,
  CAMERA_FEVER_FOV: 75,
  CAMERA_LERP_SPEED: 5,

  ROAD_SEGMENT_LENGTH: 40, // Độ dài mỗi block đường chạy (Z)
  VISIBLE_ROAD_SEGMENTS: 6 // Số lượng block đường chạy kết xuất đồng thời (phủ đủ 240m)
};

export const POWERUP_TYPES = {
  SHIELD: 'SHIELD',          // Giáp Nón Lá (đỡ 1 va chạm)
  DOUBLE_SCORE: 'DOUBLE_SCORE', // Bánh Mì X2 Score (10s)
  BOOST: 'BOOST',             // Xe Ôm Boost Siêu Tốc (6s)
  HIGH_JUMP: 'HIGH_JUMP'     // Giày Nhảy Cao Phản Lực Neon (8s)
};

export const POWERUP_CONFIG = {
  DOUBLE_SCORE_DURATION: 10000, // 10 giây
  BOOST_DURATION: 6000,         // 6 giây
  HIGH_JUMP_DURATION: 8000      // 8 giây
};

// Danh sách Nhân vật & Siêu xe (Tập trung dữ liệu 1 nơi duy nhất)
export const CHARACTERS = {
  SHIPPER: {
    id: 'shipper',
    name: 'Anh Shipper Công Nghệ',
    desc: '+10% tốc độ sạc Fever Mode',
    feverChargeBonus: 1.1,
    scoreMultBonus: 1.0,
    coffeeBonus: 1.0,
    customBuild: '_buildShipperSkin'
  },
  STUDENT: {
    id: 'student',
    name: 'Nữ Sinh Áo Dài',
    desc: '+15% hệ số điểm số tổng',
    feverChargeBonus: 1.0,
    scoreMultBonus: 1.15,
    coffeeBonus: 1.0,
    modelKey: 'student',
    modelPath: '/models/student.glb',
    targetHeight: 1.6
  },
  BARISTA: {
    id: 'barista',
    name: 'Anh Chàng Barista',
    desc: '+25% điểm bonus khi nhặt cà phê',
    feverChargeBonus: 1.0,
    scoreMultBonus: 1.0,
    coffeeBonus: 1.25,
    customBuild: '_buildBaristaSkin'
  },
  LAMBORGHINI: {
    id: 'lamborghini',
    name: 'Đại Gia Đi Ô Tô',
    desc: '+20% tổng điểm & Khung xe bọc thép sang trọng',
    feverChargeBonus: 1.15,
    scoreMultBonus: 1.2,
    coffeeBonus: 1.1,
    modelKey: 'lamborghini',
    modelPath: '/models/lamborghini.glb',
    targetWidth: 1.85,
    isCar: true
  },
  CYBERPSYCHO: {
    id: 'cyberpsycho_car',
    name: 'Cyberpsycho Supercar',
    desc: 'Siêu xe Cyberpunk cực ngầu!',
    feverChargeBonus: 1.3,
    scoreMultBonus: 1.5,
    coffeeBonus: 1.2,
    modelKey: 'cyberpsycho_car',
    modelPath: '/models/cyberpsycho_car.glb',
    targetWidth: 3.5,
    rotationY: 120 * (Math.PI / 180),
    isCar: true
  },
  FUTURISTIC_CAR: {
    id: 'futuristic_car',
    name: 'Siêu Xe Vụ Trụ',
    desc: 'Siêu xe tương lai tăng tốc x2 điểm!',
    feverChargeBonus: 1.4,
    scoreMultBonus: 1.6,
    coffeeBonus: 1.3,
    modelKey: 'futuristic_car',
    modelPath: '/models/futuristic_car.glb',
    targetWidth: 2.2,
    isCar: true
  },
  FLYING_CAR: {
    id: 'flying_car',
    name: 'Siêu Xe Bay Vũ Trụ',
    desc: 'Bất chấp mọi địa hình & Tăng tốc cực đỉnh!',
    feverChargeBonus: 1.6,
    scoreMultBonus: 2.0,
    coffeeBonus: 1.5,
    modelKey: 'flying_car',
    modelPath: '/models/flying_car.glb',
    targetWidth: 2.4,
    rotationY: Math.PI,
    isCar: true
  },
  ORION_SKYLARK: {
    id: 'orion_skylark',
    name: 'Siêu Xe Orion Skylark',
    desc: 'Thiết kế khí động học siêu cấp!',
    feverChargeBonus: 1.7,
    scoreMultBonus: 2.2,
    coffeeBonus: 1.6,
    modelKey: 'orion_skylark',
    modelPath: '/models/orion_skylark.glb',
    targetWidth: 4.0,
    rotationY: Math.PI / 2,
    isCar: true
  }
};

// Môi trường cây cối
export const EXTRA_MODELS = {
  maple_tree: '/models/maple_tree.glb',
  pine_tree: '/models/pine_tree.glb'
};
//Code viet anh sửa end