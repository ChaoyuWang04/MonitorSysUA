/**
 * Google Ads ChangeEvent Parser
 *
 * Parses raw ChangeEvent data from Google Ads API and converts it into
 * structured database records. Uses the Deep Diff engine to extract field-level changes.
 */

import type { NewChangeEvent } from '../db/schema'
import { deepDiff } from './diff-engine'

/**
 * Parse a raw ChangeEvent from Google Ads API
 *
 * @param rawEvent - Raw event data from Google Ads API query
 * @returns Parsed ChangeEvent ready for database insertion (without accountId), or null if parsing fails
 */
export function parseChangeEvent(rawEvent: any): Omit<NewChangeEvent, 'accountId'> | null {
  try {
    const changeEvent = rawEvent.change_event

    // Extract basic information
    const timestamp = new Date(changeEvent.change_date_time)
    const userEmail = changeEvent.user_email || 'unknown'
    const resourceType = changeEvent.change_resource_type
    const operationType = changeEvent.resource_change_operation
    const resourceName = changeEvent.change_resource_name
    const clientType = changeEvent.client_type || null
    const campaign = changeEvent.campaign || null
    const adGroup = changeEvent.ad_group || null

    // Extract old and new resources from the oneof wrapper
    const oldResource = extractResource(changeEvent.old_resource, resourceType)
    const newResource = extractResource(changeEvent.new_resource, resourceType)

    // Generate human-readable summary
    const summary = generateSummary(resourceType, operationType, oldResource, newResource)

    // Calculate field-level changes using Deep Diff engine
    const fieldChanges = (oldResource && newResource)
      ? deepDiff(oldResource, newResource)
      : null

    // Get changed field paths from Google Ads API
    const changedFieldsPaths = changeEvent.changed_fields?.paths || []

    return {
      timestamp,
      userEmail,
      resourceType,
      operationType,
      resourceName,
      clientType,
      campaign,
      adGroup,
      summary,
      fieldChanges: fieldChanges as any, // JSONB type
      changedFieldsPaths,
    }
  } catch (error) {
    console.error('Failed to parse change event:', error)
    return null
  }
}

/**
 * Extract the actual resource from the oneof wrapper
 *
 * Google Ads API returns resources in a oneof structure where only one field is populated.
 * This function extracts the correct field based on the resource type.
 *
 * @param resourceWrapper - The oneof wrapper (old_resource or new_resource)
 * @param resourceType - The type of resource (CAMPAIGN_BUDGET, CAMPAIGN, etc.)
 * @returns The extracted resource object, or null if not found
 */
function extractResource(resourceWrapper: any, resourceType: string): any {
  if (!resourceWrapper) return null

  // Map resource type to the correct oneof field name
  const typeMap: Record<string, string> = {
    'CAMPAIGN_BUDGET': 'campaign_budget',
    'CAMPAIGN': 'campaign',
    'AD_GROUP': 'ad_group',
    'AD_GROUP_AD': 'ad_group_ad',
  }

  const fieldName = typeMap[resourceType]
  return fieldName ? resourceWrapper[fieldName] : null
}

/**
 * Generate a human-readable summary of the change
 *
 * @param resourceType - Type of resource that changed
 * @param operationType - Type of operation (CREATE, UPDATE, REMOVE)
 * @param oldResource - Old resource state (for UPDATE operations)
 * @param newResource - New resource state (for UPDATE operations)
 * @returns Human-readable summary string
 */
function generateSummary(
  resourceType: string,
  operationType: string,
  oldResource: any,
  newResource: any
): string {
  // CREATE operation
  if (operationType === 'CREATE') {
    return `Created ${resourceType}`
  }

  // REMOVE operation
  if (operationType === 'REMOVE') {
    return `Removed ${resourceType}`
  }

  // UPDATE operations - generate specific summaries based on resource type
  if (resourceType === 'CAMPAIGN_BUDGET' && oldResource && newResource) {
    const oldAmount = (oldResource.amount_micros || 0) / 1_000_000
    const newAmount = (newResource.amount_micros || 0) / 1_000_000
    return `Budget changed from $${oldAmount} to $${newAmount}`
  }

  if (resourceType === 'CAMPAIGN' && oldResource && newResource) {
    // Check for status change
    if (oldResource.status !== newResource.status) {
      return `Campaign status changed from ${oldResource.status} to ${newResource.status}`
    }
    // Check for name change
    if (oldResource.name !== newResource.name) {
      return `Campaign renamed from "${oldResource.name}" to "${newResource.name}"`;
    }
  }

  // Generic update summary
  return `Updated ${resourceType}`
}
