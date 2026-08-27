import AppIntents
import SwiftUI
import WidgetKit

// Must match IOS_APP_GROUP / IOS_WIDGET_KIND in src/widgets/syncIosWidget.ts,
// and app.json's ios.entitlements["com.apple.security.application-groups"].
private let appGroup = "group.com.jigeummohae.app"

// The RN app writes these into the shared App Group UserDefaults via
// ExtensionStorage (see src/widgets/syncIosWidget.ts) right after it
// authenticates — the widget extension is a separate process and has no
// other way to reach the JS side or its zustand store.
private enum SharedKey {
  static let authToken = "authToken"
  static let apiBaseURL = "apiBaseURL"
}

struct WidgetPhotoResponse: Decodable {
  struct Photo: Decodable {
    let url: String
    let caption: String
    let senderName: String
    let groupName: String?
    let createdAt: String
  }
  let photo: Photo?
}

struct GroupPhotosResponse: Decodable {
  struct Item: Decodable {
    let url: String
    let caption: String
    let senderName: String
    let createdAt: String
    let isMine: Bool
  }
  let items: [Item]
}

struct JigeumMohaeEntry: TimelineEntry {
  let date: Date
  let senderName: String?
  let groupName: String?
  let caption: String?
  let timeLabel: String?
  let image: UIImage?
  let signedIn: Bool
  // Which group/friend this widget instance is configured to — shown as a
  // persistent header label so multiple widgets are distinguishable at a
  // glance (nil for the cross-group "whatever's newest" default).
  let targetLabel: String?
}

private func placeholderEntry(targetLabel: String? = nil, signedIn: Bool = true) -> JigeumMohaeEntry {
  JigeumMohaeEntry(date: Date(), senderName: nil, groupName: nil, caption: nil, timeLabel: nil, image: nil, signedIn: signedIn, targetLabel: targetLabel)
}

private func formatTimeLabel(_ iso8601: String) -> String {
  let formatter = ISO8601DateFormatter()
  let timeFormatter = DateFormatter()
  timeFormatter.dateFormat = "a h:mm"
  timeFormatter.locale = Locale(identifier: "ko_KR")
  return formatter.date(from: iso8601).map { timeFormatter.string(from: $0) } ?? ""
}

private func loadImage(url: String) async -> UIImage? {
  guard let imageURL = URL(string: url) else { return nil }
  guard let (data, _) = try? await URLSession.shared.data(from: imageURL) else { return nil }
  return UIImage(data: data)
}

// Shared by both the legacy (<iOS 17) cross-group-only provider and the
// iOS 17+ AppIntent-configurable provider below — everything except which
// endpoint to hit (and the resulting targetLabel) is identical.
private func fetchEntry(groupId: String?, targetLabel: String?) async -> JigeumMohaeEntry {
  let defaults = UserDefaults(suiteName: appGroup)
  guard
    let token = defaults?.string(forKey: SharedKey.authToken),
    let apiBaseURL = defaults?.string(forKey: SharedKey.apiBaseURL)
  else {
    return placeholderEntry(targetLabel: targetLabel, signedIn: false)
  }

  let path = groupId.map { "/groups/\($0)/photos" } ?? "/photos/widget/latest"
  guard let requestURL = URL(string: "\(apiBaseURL)\(path)") else {
    return placeholderEntry(targetLabel: targetLabel)
  }
  var request = URLRequest(url: requestURL)
  request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

  do {
    let (data, _) = try await URLSession.shared.data(for: request)

    if groupId != nil {
      let decoded = try JSONDecoder().decode(GroupPhotosResponse.self, from: data)
      // Oldest-first from the server, and only ever what I RECEIVED — never
      // my own sent photos — matching the original cross-group widget.
      guard let latest = decoded.items.last(where: { !$0.isMine }) else {
        return placeholderEntry(targetLabel: targetLabel)
      }
      let image = await loadImage(url: latest.url)
      return JigeumMohaeEntry(
        date: Date(), senderName: latest.senderName, groupName: nil, caption: latest.caption,
        timeLabel: formatTimeLabel(latest.createdAt), image: image, signedIn: true, targetLabel: targetLabel
      )
    } else {
      let decoded = try JSONDecoder().decode(WidgetPhotoResponse.self, from: data)
      guard let photo = decoded.photo else { return placeholderEntry(targetLabel: targetLabel) }
      let image = await loadImage(url: photo.url)
      return JigeumMohaeEntry(
        date: Date(), senderName: photo.senderName, groupName: photo.groupName, caption: photo.caption,
        timeLabel: formatTimeLabel(photo.createdAt), image: image, signedIn: true, targetLabel: targetLabel
      )
    }
  } catch {
    return placeholderEntry(targetLabel: targetLabel)
  }
}

// MARK: - iOS 17+: per-widget-instance configurable target

@available(iOS 17.0, *)
struct ConfigurableProvider: AppIntentTimelineProvider {
  typealias Entry = JigeumMohaeEntry
  typealias Intent = SelectWidgetTargetIntent

  func placeholder(in context: Context) -> JigeumMohaeEntry {
    placeholderEntry()
  }

  func snapshot(for configuration: SelectWidgetTargetIntent, in context: Context) async -> JigeumMohaeEntry {
    placeholderEntry(targetLabel: configuration.target?.name)
  }

  func timeline(for configuration: SelectWidgetTargetIntent, in context: Context) async -> Timeline<JigeumMohaeEntry> {
    let entry = await fetchEntry(groupId: configuration.target?.id, targetLabel: configuration.target?.name)
    // Native OS refresh has a practical ~30 min floor; the app also calls
    // WidgetCenter.reloadTimelines() proactively after it polls new data
    // (see refreshWidget() in useAppStore.ts) so this is just the fallback.
    let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    return Timeline(entries: [entry], policy: .after(nextRefresh))
  }
}

// MARK: - Pre-iOS 17 fallback: cross-group only, no per-widget configuration

struct LegacyProvider: TimelineProvider {
  func placeholder(in context: Context) -> JigeumMohaeEntry {
    placeholderEntry()
  }

  func getSnapshot(in context: Context, completion: @escaping (JigeumMohaeEntry) -> Void) {
    completion(placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<JigeumMohaeEntry>) -> Void) {
    Task {
      let entry = await fetchEntry(groupId: nil, targetLabel: nil)
      let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
      completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
  }
}

struct JigeumMohaeWidgetEntryView: View {
  var entry: JigeumMohaeEntry

  var body: some View {
    ZStack {
      Color(red: 0x27 / 255, green: 0x1A / 255, blue: 0x47 / 255)

      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Circle()
            .fill(Color(red: 1, green: 0.435, blue: 0.506))
            .frame(width: 6, height: 6)
          Text(entry.targetLabel.map { "지금 모해 · \($0)" } ?? "지금 모해")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(red: 0.77, green: 0.72, blue: 0.9))
            .lineLimit(1)
          Spacer()
        }

        if let image = entry.image {
          ZStack(alignment: .bottomLeading) {
            Image(uiImage: image)
              .resizable()
              .aspectRatio(contentMode: .fill)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .clipped()

            VStack(alignment: .leading, spacing: 2) {
              Text("\(entry.senderName ?? "")\(entry.groupName.map { " · \($0)" } ?? "") · \(entry.timeLabel ?? "")")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
              if let caption = entry.caption, !caption.isEmpty {
                Text(caption)
                  .font(.system(size: 10))
                  .foregroundColor(.white.opacity(0.85))
                  .lineLimit(1)
              }
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.black.opacity(0.4))
          }
          .clipShape(RoundedRectangle(cornerRadius: 18))
        } else {
          RoundedRectangle(cornerRadius: 18)
            .strokeBorder(Color(red: 1, green: 0.84, blue: 0.4).opacity(0.45), style: StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
            .background(RoundedRectangle(cornerRadius: 18).fill(Color(red: 1, green: 0.84, blue: 0.4).opacity(0.06)))
            .overlay(
              VStack(spacing: 4) {
                Text("📷").font(.system(size: 26))
                Text(entry.signedIn ? "기다리는 중..." : "앱을 먼저 열어주세요")
                  .font(.system(size: 13, weight: .bold))
                  .foregroundColor(Color(red: 1, green: 0.84, blue: 0.4))
                if entry.signedIn {
                  Text("탭하면 바로 촬영")
                    .font(.system(size: 10))
                    .foregroundColor(Color(red: 0.52, green: 0.47, blue: 0.67))
                }
              }
            )
        }
      }
      .padding(14)
    }
    // Tapping opens straight into the camera when waiting, otherwise just
    // opens the app — mirrors the Android widget's OPEN_APP / OPEN_URI split
    // and the in-app home widget's tap-to-camera behavior.
    .widgetURL(URL(string: entry.image == nil ? "jigeummohae://camera" : "jigeummohae://"))
  }
}

@available(iOS 17.0, *)
struct JigeumMohaeWidget: Widget {
  let kind: String = "JigeumMohaeWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectWidgetTargetIntent.self, provider: ConfigurableProvider()) { entry in
      JigeumMohaeWidgetEntryView(entry: entry)
        .containerBackground(for: .widget) {
          Color(red: 0x27 / 255, green: 0x1A / 255, blue: 0x47 / 255)
        }
    }
    .configurationDisplayName("지금 모해")
    .description("친구가 보낸 사진이 바로 뜨는 위젯 · 길게 눌러 그룹/친구를 고를 수 있어요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct JigeumMohaeWidgetLegacy: Widget {
  let kind: String = "JigeumMohaeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LegacyProvider()) { entry in
      JigeumMohaeWidgetEntryView(entry: entry)
        .containerBackground(for: .widget) {
          Color(red: 0x27 / 255, green: 0x1A / 255, blue: 0x47 / 255)
        }
    }
    .configurationDisplayName("지금 모해")
    .description("친구가 보낸 사진이 바로 뜨는 위젯 · 대기중일 땐 탭하면 바로 촬영해요.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct JigeumMohaeWidgetBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 17.0, *) {
      JigeumMohaeWidget()
    } else {
      JigeumMohaeWidgetLegacy()
    }
  }
}
