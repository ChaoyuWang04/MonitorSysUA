
# Google Ads ChangeEvent — 必须采集的字段全集（按资源层级整理）

本文件整理了你系统中 **必须采集 + diff** 的全部字段。
这些字段来自 Google Ads 的核心资源，对判断“优化师做了什么”和“这些动作是否有效”至关重要。

---

# 🔥 第一层：Campaign（最关键，也是影响最大的一层）

以下是 **优化师最常操作、也是直接影响 Campaign 效果的字段**。

## 📌 Campaign 预算策略（Bidding / Budget）

- `campaign_budget.amount_micros`
- `campaign.bidding_strategy_type`
- `campaign.target_roas.target_roas`
- `campaign.target_cpa.target_cpa_micros`
- `campaign.maximize_conversions.target_cpa_micros`
- `campaign.maximize_conversion_value.target_roas`

## 📌 Campaign 状态控制

- `campaign.status`（ENABLED / PAUSED / REMOVED）
- `campaign.ad_serving_optimization_status`
- `campaign.start_date`
- `campaign.end_date`

## 📌 投放控制（渠道选择）

- `campaign.advertising_channel_type`（Search / Display / Video / PMax）
- `campaign.advertising_channel_sub_type`
- `campaign.network_settings.*` （Search / Display / Youtube / Partners）

## 📌 定向（强影响字段）

- `campaign.geo_target_type_setting.positive_geo_target_type`
- `campaign.geo_target_type_setting.negative_geo_target_type`
- `campaign.targeting_setting.target_restrictions`
- `campaign.targeting_location`（地域）

## 📌 预算结构

- `campaign_budget.delivery_method`
- `campaign_budget.period`

## 📌 转化归因（Tracking / UTM）

- `campaign.tracking_setting.tracking_url_template`
- `campaign.url_custom_parameters`（UTM）

---

# 🔥 第二层：AdGroup（预算分配与竞价层）

这层控制同一 Campaign 内的预算与竞价细分。

## 📌 状态控制

- `ad_group.status`

## 📌 出价策略（Search / Display 常见）

- `ad_group.cpc_bid_micros`
- `ad_group.cpv_bid_micros`
- `ad_group.target_cpa_micros`
- `ad_group.target_roas`

## 📌 定向条件

- `ad_group.targeting_setting.target_restrictions`

## 📌 预算结构（PMax 使用 AssetGroup 不使用 AdGroup）

- `ad_group.percent_cpc_bid_micros`

## 📌 受众（Audience）

- `ad_group.audience`

---

# 🔥 第三层：Ad（创意层，影响 CTR / CVR 最直接）

所有创意更新行为都需要记录，因为它们直接影响 CTR / CVR。

## 📌 文本字段（Search Ad）

- `ad.text_ad.headline`
- `ad.text_ad.description`

## 📌 响应式搜索广告（RSA）

- `ad.responsive_search_ad.headlines`
- `ad.responsive_search_ad.descriptions`
- `ad.responsive_search_ad.path1`
- `ad.responsive_search_ad.path2`

## 📌 图片（Display / PMax）

- `ad.image_ad.media_file`
- `ad.responsive_display_ad.images`
- `ad.app_ad.images`

## 📌 视频（YouTube & PMax）

- `ad.video_ad.video`

## 📌 URL & 路径

- `ad.final_urls`
- `ad.final_app_urls`

---

# 🔥 第四层：AdGroupCriterion（关键词与受众定向）

影响 Search 的核心资源，需要重点记录。

## 📌 关键词字段

- `ad_group_criterion.keyword.text`
- `ad_group_criterion.keyword.match_type`
- `ad_group_criterion.negative`
- `ad_group_criterion.status`
- `bid_modifier`
- `cpc_bid_micros`

## 📌 受众定向（UserList / Custom Audience）

- `ad_group_criterion.user_list`
- `ad_group_criterion.custom_audience`

---

# 🔥 第五层：Asset（素材库）

单个素材的更新影响 PMax 和 RSA，在性能学习中非常关键。

## 📌 文案资产

- `asset.text_asset.text`

## 📌 图片资产

- `asset.image_asset.data`
- `asset.image_asset.full_size_image_url`

## 📌 视频资产

- `asset.youtube_video_asset.youtube_video_id`

## 📌 扩展类资产（Extensions）

- `asset.callout_asset.text`
- `asset.sitelink_asset.final_url`
- `asset.structured_snippet.values`

---

# 🔥 第六层：AssetGroup（PMax 最核心资源）

如果你使用 PMax，这些字段必须被收集。

## 📌 创意组字段

- `asset_group.status`
- `asset_group.final_url`
- `asset_group.final_mobile_url`

## 📌 PMax 创意组合结构

- `asset_group.asset_group_assets.asset`
- `asset_group.targeting_setting`
- `asset_group.bidding_strategy`

---

# 🧩 总结

这个字段列表构成了你 **Diff Engine、行为数据库、优化师绩效系统、操作效果模型** 的核心数据源。

任何想分析“优化动作 → 效果变化”的系统，都必须完整掌握这一套字段。

本文件可直接用于：

- 数据库表字段设计
- Diff 结构定义
- 指标归因模型
- 前端操作记录展示 UI
- 未来机器学习特征工程
