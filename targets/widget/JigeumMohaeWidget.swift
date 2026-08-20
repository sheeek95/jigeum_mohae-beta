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
    let createdAt: String
  }
  let photo: Photo?
}

struct JigeumMohaeEntry: TimelineEntry {
  let date: Date
  let senderName: String?
  let caption: String?
  let timeLabel: String?
  let image: UIImage?
  let signedIn: Bool
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> JigeumMohaeEntry {
    JigeumMohaeEntry(date: Date(), senderName: nil, caption: nil, timeLabel: nil, image: nil, signedIn: true)
  }

  func getSnapshot(in context: Context, completion: @escaping (JigeumMohaeEntry) -> Void) {
    completion(placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<JigeumMohaeEntry>) -> Void) {
    Task {
      let entry = await fetchEntry()
      // Native OS refresh has a practical ~30 min floor; the app also calls
      // WidgetCenter.reloadTimelines() proactively after it polls new data
      // (see refreshWidget() in useAppStore.ts) so this is just the fallback.
      let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
      completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
  }

  private func fetchEntry() async -> JigeumMohaeEntry {
    let defaults = UserDefaults(suiteName: appGroup)
    guard
      let token = defaults?.string(forKey: SharedKey.authToken),
      let apiBaseURL = defaults?.string(forKey: SharedKey.apiBaseURL),
      let requestURL = URL(string: "\(apiBaseURL)/photos/widget/latest")
    else {
      return JigeumMohaeEntry(date: Date(), senderName: nil, caption: nil, timeLabel: nil, image: nil, signedIn: false)
    }

    var request = URLRequest(url: requestURL)
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    do {
      let (data, _) = try await URLSession.shared.data(for: request)
      let decoded = try JSONDecoder().decode(WidgetPhotoResponse.self, from: data)
      guard let photo = decoded.photo, let imageURL = URL(string: photo.url) else {
        return JigeumMohaeEntry(date: Date(), senderName: nil, caption: nil, timeLabel: nil, image: nil, signedIn: true)
      }

      let (imageData, _) = try await URLSession.shared.data(from: imageURL)
      let image = UIImage(data: imageData)

      let formatter = ISO8601DateFormatter()
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "a h:mm"
      timeFormatter.locale = Locale(identifier: "ko_KR")
      let timeLabel = formatter.date(from: photo.createdAt).map { timeFormatter.string(from: $0) } ?? ""

      return JigeumMohaeEntry(
        date: Date(),
        senderName: photo.senderName,
        caption: photo.caption,
        timeLabel: timeLabel,
        image: image,
        signedIn: true
      )
    } catch {
      return JigeumMohaeEntry(date: Date(), senderName: nil, caption: nil, timeLabel: nil, image: nil, signedIn: true)
    }
  }
}

struct JigeumMohaeWidgetEntryView: View {
  var entry: Provider.Entry

  var body: some View {
    ZStack {
      Color(red: 0x27 / 255, green: 0x1A / 255, blue: 0x47 / 255)

      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Circle()
            .fill(Color(red: 1, green: 0.435, blue: 0.506))
            .frame(width: 6, height: 6)
          Text("지금 모해")
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Color(red: 0.77, green: 0.72, blue: 0.9))
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
              Text("\(entry.senderName ?? "") · \(entry.timeLabel ?? "")")
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

struct JigeumMohaeWidget: Widget {
  let kind: String = "JigeumMohaeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
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
    JigeumMohaeWidget()
  }
}
