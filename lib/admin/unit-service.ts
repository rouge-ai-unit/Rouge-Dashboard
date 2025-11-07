/**
 * Unit/Department Management Service
 * Enterprise-grade unit administration
 */

import { getDb } from '@/utils/dbConfig';
import { Units, Users, RoleChangeHistory } from '@/utils/auth-schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { Unit, NewUnit } from '@/utils/auth-schema';

// ============================================================================
// UNIT CRUD OPERATIONS
// ============================================================================

/**
 * Get all units
 */
export async function getAllUnits(includeInactive = false): Promise<any[]> {
  try {
    const db = getDb();
    
    let query = db
      .select({
        id: Units.id,
        name: Units.name,
        description: Units.description,
        code: Units.code,
        leaderId: Units.leaderId,
        coLeaderId: Units.coLeaderId,
        isActive: Units.isActive,
        color: Units.color,
        icon: Units.icon,
        memberCount: Units.memberCount,
        createdAt: Units.createdAt,
        updatedAt: Units.updatedAt,
        leaderName: Users.displayName,
        leaderEmail: Users.email,
      })
      .from(Units)
      .leftJoin(Users, eq(Units.leaderId, Users.id));
    
    if (!includeInactive) {
      query = query.where(eq(Units.isActive, true)) as any;
    }
    
    const units = await query.orderBy(Units.name);
    
    return units;
  } catch (error) {
    console.error('[Unit Service] Error getting units:', error);
    return [];
  }
}

/**
 * Get unit by ID
 */
export async function getUnitById(unitId: string): Promise<Unit | null> {
  try {
    const db = getDb();
    
    const [unit] = await db
      .select()
      .from(Units)
      .where(eq(Units.id, unitId))
      .limit(1);
    
    return unit || null;
  } catch (error) {
    console.error('[Unit Service] Error getting unit:', error);
    return null;
  }
}

/**
 * Create new unit
 */
export async function createUnit(data: {
  name: string;
  description?: string;
  code?: string;
  leaderId?: string;
  coLeaderId?: string;
  color?: string;
  icon?: string;
  createdBy: string;
}): Promise<Unit> {
  try {
    const db = getDb();
    
    const [unit] = await db.insert(Units).values({
      name: data.name,
      description: data.description,
      code: data.code,
      leaderId: data.leaderId,
      coLeaderId: data.coLeaderId,
      color: data.color || '#3B82F6',
      icon: data.icon || 'Users',
      isActive: true,
      memberCount: 0,
      createdBy: data.createdBy,
    }).returning();
    
    console.log(`[Unit Service] Created unit: ${unit.name}`);
    
    return unit;
  } catch (error) {
    console.error('[Unit Service] Error creating unit:', error);
    throw error;
  }
}

/**
 * Update unit
 */
export async function updateUnit(
  unitId: string,
  data: Partial<Unit>
): Promise<Unit> {
  try {
    const db = getDb();
    
    const [unit] = await db
      .update(Units)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(Units.id, unitId))
      .returning();
    
    console.log(`[Unit Service] Updated unit: ${unit.name}`);
    
    return unit;
  } catch (error) {
    console.error('[Unit Service] Error updating unit:', error);
    throw error;
  }
}

/**
 * Delete unit (soft delete by setting inactive)
 */
export async function deleteUnit(unitId: string): Promise<boolean> {
  try {
    const db = getDb();
    
    // Check if unit has members
    const [unit] = await db
      .select()
      .from(Units)
      .where(eq(Units.id, unitId))
      .limit(1);
    
    if (unit && (unit.memberCount || 0) > 0) {
      throw new Error('Cannot delete unit with active members');
    }
    
    // Soft delete
    await db
      .update(Units)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(Units.id, unitId));
    
    console.log(`[Unit Service] Deleted unit: ${unitId}`);
    
    return true;
  } catch (error) {
    console.error('[Unit Service] Error deleting unit:', error);
    throw error;
  }
}

/**
 * Update unit member count
 */
export async function updateUnitMemberCount(unitName: string): Promise<void> {
  try {
    const db = getDb();
    
    // Count members in this unit
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(Users)
      .where(
        and(
          eq(Users.unit, unitName),
          eq(Users.isActive, true)
        )
      );
    
    const count = Number(result[0]?.count || 0);
    
    // Update unit
    await db
      .update(Units)
      .set({
        memberCount: count,
        updatedAt: new Date(),
      })
      .where(eq(Units.name, unitName));
    
  } catch (error) {
    console.error('[Unit Service] Error updating member count:', error);
  }
}

/**
 * Assign leader to unit
 */
export async function assignUnitLeader(
  unitId: string,
  userId: string,
  isCoLeader = false
): Promise<Unit> {
  try {
    const db = getDb();
    
    const updateData = isCoLeader
      ? { coLeaderId: userId }
      : { leaderId: userId };
    
    const [unit] = await db
      .update(Units)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(Units.id, unitId))
      .returning();
    
    // Update user role
    await db
      .update(Users)
      .set({
        role: isCoLeader ? 'co-leader' : 'leader',
        unit: unit.name,
        updatedAt: new Date(),
      })
      .where(eq(Users.id, userId));
    
    console.log(`[Unit Service] Assigned ${isCoLeader ? 'co-leader' : 'leader'} to unit: ${unit.name}`);
    
    return unit;
  } catch (error) {
    console.error('[Unit Service] Error assigning leader:', error);
    throw error;
  }
}

// ============================================================================
// ROLE CHANGE HISTORY
// ============================================================================

/**
 * Log role change
 */
export async function logRoleChange(data: {
  userId: string;
  changedBy: string;
  oldRole: string;
  newRole: string;
  oldUnit?: string;
  newUnit?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const db = getDb();
    
    await db.insert(RoleChangeHistory).values({
      userId: data.userId,
      changedBy: data.changedBy,
      oldRole: data.oldRole,
      newRole: data.newRole,
      oldUnit: data.oldUnit,
      newUnit: data.newUnit,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
    
    console.log(`[Unit Service] Logged role change: ${data.oldRole} → ${data.newRole}`);
  } catch (error) {
    console.error('[Unit Service] Error logging role change:', error);
  }
}

/**
 * Get role change history for user
 */
export async function getUserRoleHistory(userId: string): Promise<any[]> {
  try {
    const db = getDb();
    
    const history = await db
      .select({
        id: RoleChangeHistory.id,
        oldRole: RoleChangeHistory.oldRole,
        newRole: RoleChangeHistory.newRole,
        oldUnit: RoleChangeHistory.oldUnit,
        newUnit: RoleChangeHistory.newUnit,
        reason: RoleChangeHistory.reason,
        createdAt: RoleChangeHistory.createdAt,
        changedByName: Users.displayName,
        changedByEmail: Users.email,
      })
      .from(RoleChangeHistory)
      .leftJoin(Users, eq(RoleChangeHistory.changedBy, Users.id))
      .where(eq(RoleChangeHistory.userId, userId))
      .orderBy(desc(RoleChangeHistory.createdAt));
    
    return history;
  } catch (error) {
    console.error('[Unit Service] Error getting role history:', error);
    return [];
  }
}

/**
 * Get all role changes (admin view)
 */
export async function getAllRoleChanges(limit = 100): Promise<any[]> {
  try {
    const db = getDb();
    
    const history = await db
      .select({
        id: RoleChangeHistory.id,
        userId: RoleChangeHistory.userId,
        userName: sql<string>`u1.display_name`,
        userEmail: sql<string>`u1.email`,
        oldRole: RoleChangeHistory.oldRole,
        newRole: RoleChangeHistory.newRole,
        oldUnit: RoleChangeHistory.oldUnit,
        newUnit: RoleChangeHistory.newUnit,
        reason: RoleChangeHistory.reason,
        createdAt: RoleChangeHistory.createdAt,
        changedByName: sql<string>`u2.display_name`,
        changedByEmail: sql<string>`u2.email`,
      })
      .from(RoleChangeHistory)
      .leftJoin(sql`users u1`, sql`role_change_history.user_id = u1.id`)
      .leftJoin(sql`users u2`, sql`role_change_history.changed_by = u2.id`)
      .orderBy(desc(RoleChangeHistory.createdAt))
      .limit(limit);
    
    return history;
  } catch (error) {
    console.error('[Unit Service] Error getting all role changes:', error);
    return [];
  }
}
