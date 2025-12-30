#!/usr/bin/env python3
"""
Fetch full state of campaigns, ad groups, and ads for a Google Ads account.

Usage:
    python fetch_entities.py <customer_id>

Outputs JSON:
{
  "campaigns": [...],
  "adGroups": [...],
  "ads": [...]
}
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from pathlib import Path
from typing import Any, Dict, List
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException



def resolve_config_path(config_path: str | Path | None = None) -> Path:
  """Resolve Google Ads YAML config path with optional explicit override."""
  if config_path:
    candidate = Path(config_path)
  else:
    candidate = Path(__file__).resolve().parents[2] / "local" / "credentials" / "google-ads" / "google-ads.yaml"

  candidate = candidate.expanduser().resolve()
  if not candidate.exists():
    raise FileNotFoundError(
      f"Google Ads config not found at {candidate}. "
      "Place google-ads.yaml in local/credentials/google-ads/ or pass an explicit path."
    )
  return candidate


def search_rows(client: GoogleAdsClient, customer_id: str, query: str):
  """Stream GAQL results and yield rows."""
  api_version = "v22"
  ga_service = client.get_service("GoogleAdsService", version=api_version)
  stream = ga_service.search_stream(
    request={"customer_id": customer_id, "query": query}
  )
  for batch in stream:
    for row in batch.results:
      yield row


def parse_campaigns(client: GoogleAdsClient, customer_id: str) -> List[Dict[str, Any]]:
  api_version = "v22"
  CampaignStatusEnum = client.get_type("CampaignStatusEnum", version=api_version).CampaignStatus
  ServingStatusEnum = client.get_type("CampaignServingStatusEnum", version=api_version).CampaignServingStatus
  PrimaryStatusEnum = client.get_type("CampaignPrimaryStatusEnum", version=api_version).CampaignPrimaryStatus
  ChannelTypeEnum = client.get_type("AdvertisingChannelTypeEnum", version=api_version).AdvertisingChannelType
  ChannelSubTypeEnum = client.get_type("AdvertisingChannelSubTypeEnum", version=api_version).AdvertisingChannelSubType
  BiddingStrategyTypeEnum = client.get_type("BiddingStrategyTypeEnum", version=api_version).BiddingStrategyType

  # GAQL does not allow SQL-style JOIN keywords; related fields can be selected directly.
  query = """
    SELECT
      campaign.resource_name,
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.serving_status,
      campaign.primary_status,
      campaign.advertising_channel_type,
      campaign.advertising_channel_sub_type,
      campaign.bidding_strategy_type,
      campaign.start_date,
      campaign.end_date,
      campaign.campaign_budget,
      campaign_budget.amount_micros
    FROM campaign
  """

  campaigns: List[Dict[str, Any]] = []
  for row in search_rows(client, customer_id, query):
    campaign = row.campaign
    budget = row.campaign_budget
    campaigns.append({
      "resourceName": campaign.resource_name,
      "campaignId": str(campaign.id),
      "name": campaign.name if campaign.name else None,
      "status": CampaignStatusEnum.Name(campaign.status) if campaign.status is not None else None,
      "servingStatus": ServingStatusEnum.Name(campaign.serving_status) if campaign.serving_status is not None else None,
      "primaryStatus": PrimaryStatusEnum.Name(campaign.primary_status) if campaign.primary_status is not None else None,
      "channelType": ChannelTypeEnum.Name(campaign.advertising_channel_type) if campaign.advertising_channel_type is not None else None,
      "channelSubType": ChannelSubTypeEnum.Name(campaign.advertising_channel_sub_type) if campaign.advertising_channel_sub_type is not None else None,
      "biddingStrategyType": BiddingStrategyTypeEnum.Name(campaign.bidding_strategy_type) if campaign.bidding_strategy_type is not None else None,
      "startDate": campaign.start_date if campaign.start_date else None,
      "endDate": campaign.end_date if campaign.end_date else None,
      "budgetId": campaign.campaign_budget if campaign.campaign_budget else None,
      "budgetAmountMicros": int(budget.amount_micros) if budget and budget.amount_micros else None,
      "lastModifiedTime": None,
    })
  return campaigns


def parse_ad_groups(client: GoogleAdsClient, customer_id: str) -> List[Dict[str, Any]]:
  AdGroupStatusEnum = client.get_type("AdGroupStatusEnum").AdGroupStatus
  AdGroupTypeEnum = client.get_type("AdGroupTypeEnum").AdGroupType

  query = """
    SELECT
      ad_group.resource_name,
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      ad_group.cpc_bid_micros,
      ad_group.cpm_bid_micros,
      ad_group.target_cpa_micros,
      campaign.id,
      campaign.resource_name
    FROM ad_group
    WHERE campaign.id IS NOT NULL
  """

  ad_groups: List[Dict[str, Any]] = []
  for row in search_rows(client, customer_id, query):
    ad_group = row.ad_group
    campaign = row.campaign if hasattr(row, "campaign") else None
    ad_group_type = getattr(ad_group, "type_", None)
    ad_groups.append({
      "resourceName": ad_group.resource_name,
      "adGroupId": str(ad_group.id),
      "campaignId": str(campaign.id) if campaign and campaign.id else None,
      "name": ad_group.name if ad_group.name else None,
      "status": AdGroupStatusEnum.Name(ad_group.status) if ad_group.status is not None else None,
      "type": AdGroupTypeEnum.Name(ad_group_type) if ad_group_type is not None else None,
      "cpcBidMicros": int(ad_group.cpc_bid_micros) if ad_group.cpc_bid_micros else None,
      "cpmBidMicros": int(ad_group.cpm_bid_micros) if ad_group.cpm_bid_micros else None,
      "targetCpaMicros": int(ad_group.target_cpa_micros) if ad_group.target_cpa_micros else None,
      "lastModifiedTime": None,
    })
  return ad_groups


def parse_ads(client: GoogleAdsClient, customer_id: str) -> List[Dict[str, Any]]:
  AdGroupAdStatusEnum = client.get_type("AdGroupAdStatusEnum").AdGroupAdStatus
  AdTypeEnum = client.get_type("AdTypeEnum").AdType
  DeviceEnum = client.get_type("DeviceEnum").Device
  SystemManagedResourceSourceEnum = client.get_type("SystemManagedResourceSourceEnum").SystemManagedResourceSource

  query = """
    SELECT
      ad_group_ad.ad.resource_name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.status,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.final_mobile_urls,
      ad_group_ad.ad.display_url,
      ad_group_ad.ad.device_preference,
      ad_group_ad.ad.system_managed_resource_source,
      ad_group_ad.ad.added_by_google_ads,
      ad_group.id,
      ad_group.resource_name,
      campaign.id,
      campaign.resource_name
    FROM ad_group_ad
    WHERE campaign.id IS NOT NULL
  """

  ads: List[Dict[str, Any]] = []
  for row in search_rows(client, customer_id, query):
    ad_group_ad = row.ad_group_ad
    ad = ad_group_ad.ad
    ad_group = row.ad_group if hasattr(row, "ad_group") else None
    campaign = row.campaign if hasattr(row, "campaign") else None
    ad_type = getattr(ad, "type_", None)
    ads.append({
      "resourceName": ad.resource_name,
      "adId": str(ad.id),
      "adGroupId": str(ad_group.id) if ad_group and ad_group.id else None,
      "campaignId": str(campaign.id) if campaign and campaign.id else None,
      "name": ad.name if ad.name else None,
      "status": AdGroupAdStatusEnum.Name(ad_group_ad.status) if ad_group_ad.status is not None else None,
      "type": AdTypeEnum.Name(ad_type) if ad_type is not None else None,
      "finalUrls": list(ad.final_urls) if ad.final_urls else [],
      "finalMobileUrls": list(ad.final_mobile_urls) if ad.final_mobile_urls else [],
      "displayUrl": ad.display_url if ad.display_url else None,
      "devicePreference": DeviceEnum.Name(ad.device_preference) if ad.device_preference is not None else None,
      "systemManagedResourceSource": SystemManagedResourceSourceEnum.Name(ad.system_managed_resource_source) if ad.system_managed_resource_source is not None else None,
      "addedByGoogleAds": bool(ad.added_by_google_ads) if ad.HasField("added_by_google_ads") else None,
      "lastModifiedTime": None,
    })
  return ads


def main():
  if len(sys.argv) < 2:
    print(json.dumps({"error": "Usage: python fetch_entities.py <customer_id>"}))
    sys.exit(1)

  customer_id = sys.argv[1]
  config_path = sys.argv[2] if len(sys.argv) > 2 else None
  login_customer_id = os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID")

  try:
    resolved_config = resolve_config_path(config_path)
    client = GoogleAdsClient.load_from_storage(str(resolved_config))
    if login_customer_id:
      client.login_customer_id = login_customer_id

    campaigns = parse_campaigns(client, customer_id)
    ad_groups = parse_ad_groups(client, customer_id)
    ads = parse_ads(client, customer_id)

    print(json.dumps({
      "campaigns": campaigns,
      "adGroups": ad_groups,
      "ads": ads,
    }, ensure_ascii=False))
  except FileNotFoundError as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
  except GoogleAdsException as ex:
    error_messages = [f'{e.error_code}: {e.message}' for e in ex.failure.errors]
    print(json.dumps({"error": "GoogleAdsException", "messages": error_messages}))
    sys.exit(1)
  except Exception as e:
    # Surface stack trace for debugging
    print(json.dumps({
      "error": str(e),
      "traceback": traceback.format_exc(),
    }))
    sys.exit(1)


if __name__ == "__main__":
  main()
