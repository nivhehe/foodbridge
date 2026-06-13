export function rowToFood(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    unit: row.unit,
    description: row.description,
    expiryTime: row.expiry_time,
    pickupLocation: {
      latitude: row.pickup_lat,
      longitude: row.pickup_lng,
      addressSentence: row.pickup_address,
    },
    status: row.status,
    postedBy: row.posted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    email: row.email,
    phone: row.phone,
    userType: row.user_type,
    orgName: row.org_name,
    address: row.address,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToUserPublic(row) {
  if (!row) return null;
  return {
    orgName: row.org_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    description: row.description,
  };
}

export function rowToOrder(row) {
  if (!row) return null;
  return {
    _id: row.id,
    food: row.food_id,
    ngo: row.ngo_id,
    quantity: row.quantity,
    handshakeCode: row.handshake_code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMessage(row) {
  if (!row) return null;
  return {
    _id: row.id,
    order: row.order_id,
    sender: row.sender_id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
