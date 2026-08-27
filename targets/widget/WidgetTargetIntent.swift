import AppIntents
import WidgetKit

// Must match group.com.jigeummohae.app used everywhere else in this target,
// and the "groups" key written by syncIosWidgetGroups() in
// src/widgets/syncIosWidget.ts.
private let appGroup = "group.com.jigeummohae.app"

// One selectable target in the widget's "위젯 편집" configuration UI — either
// a real GROUP or a 1:1 PERSONAL friend target. Mirrors WidgetTarget in
// src/widgets/widgetTargets.ts.
@available(iOS 17.0, *)
struct GroupTargetEntity: AppEntity {
  let id: String
  let name: String
  let kind: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "그룹/친구"
  static var defaultQuery = GroupTargetQuery()

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)", subtitle: kind == "GROUP" ? "그룹" : "친구")
  }
}

// The widget extension is a separate process with no network/JS access
// during configuration — it reads the group list the main app already
// synced into shared storage (see syncIosWidgetGroups), the same pattern
// JigeumMohaeWidget.swift's Provider uses for the auth token.
@available(iOS 17.0, *)
struct GroupTargetQuery: EntityQuery {
  private struct StoredGroup: Decodable {
    let id: String
    let name: String
    let kind: String
  }

  private func loadAll() -> [GroupTargetEntity] {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let data = defaults.data(forKey: "groups"),
      let decoded = try? JSONDecoder().decode([StoredGroup].self, from: data)
    else {
      return []
    }
    return decoded.map { GroupTargetEntity(id: $0.id, name: $0.name, kind: $0.kind) }
  }

  func entities(for identifiers: [GroupTargetEntity.ID]) async throws -> [GroupTargetEntity] {
    loadAll().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [GroupTargetEntity] {
    loadAll()
  }
}

// Widget configuration intent — `target` left unset (nil) means "cross-group:
// show whatever's newest anywhere", matching the widget's original,
// pre-configuration behavior and Android's "전체 (가장 최근 사진)" option.
@available(iOS 17.0, *)
struct SelectWidgetTargetIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "위젯에 표시할 대상"
  static var description = IntentDescription("이 위젯에서 보여줄 그룹이나 친구를 골라주세요.")

  @Parameter(title: "그룹/친구")
  var target: GroupTargetEntity?
}
