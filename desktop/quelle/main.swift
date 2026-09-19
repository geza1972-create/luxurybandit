// WERBEFILM STUDIO — die Mac-Anwendung
//
// Owner 18.09.2026: „ich muss mich im Kreis auch sehen. Ich muss das Original-Fenster sehen und
// verschieben können, also Aufnahmefenster mit mir im Kreis unten" · „deswegen sage ich, es ist
// besser als Desktop-Tool" · „Desktop-Anwendung".
//
// ── WARUM DER KREIS AUF DEM BILDSCHIRM LIEGT UND NICHT ERST IM EXPORT ───────────────────────
//
// Die erste Fassung nahm Kamera und Bildschirm getrennt auf und legte den Kreis hinterher
// darüber. Das hat einen Fehler, den man erst beim fertigen Film sieht: Während man spricht,
// weiß man nicht, ob man im Bild ist, ob das Fenster im Rahmen liegt, ob der Kreis den Knopf
// verdeckt, den man gerade erklärt. Hier schwebt der Kreis als eigenes Fenster IMMER OBEN auf
// dem Schirm — du siehst dich, du kannst dich verschieben — und die Bildschirmaufnahme nimmt
// ihn mit. Was du siehst, ist der Film.
//
// Das spart außerdem die Lippensynchronität: Ton und Bild kommen aus EINER Aufnahme.
//
// ── DER RAHMEN IST DAS HANDYFORMAT ──────────────────────────────────────────────────────────
//
// Ein zweites schwebendes Fenster zeichnet nur einen Strich um die Fläche, die aufgenommen
// wird — im gewählten Seitenverhältnis. Der Strich liegt AUSSERHALB dieser Fläche, damit er
// nicht mit im Film ist. Solange „Rahmen verschieben" aus ist, gehen alle Klicks durch ihn
// hindurch: Du arbeitest in Chrome, als wäre er nicht da, und schiebst das Chrome-Fenster
// dahinter zurecht.
//
// ── AUFGENOMMEN WIRD MIT FFMPEG, GERECHNET DANACH ───────────────────────────────────────────
//
// Während der Aufnahme darf der Rechner nicht rechnen (sonst fehlen Bilder): Der ganze Schirm
// geht mit `-preset ultrafast` auf die Platte. Erst beim Stoppen wird auf den Rahmen
// zugeschnitten, auf die Zielmaße gebracht und als MP4/H.264 geschrieben — das Format, das Meta
// und YouTube nehmen.

import AppKit
import AVFoundation
import AVKit
import CoreGraphics
import CoreImage

// ── DIE FORMATE ─────────────────────────────────────────────────────────────────────────────
struct Format {
    let name: String
    let kuerzel: String
    let breit: Int
    let hoch: Int
    var verhaeltnis: CGFloat { CGFloat(breit) / CGFloat(hoch) }
}

let FORMATE = [
    Format(name: "Reels/Shorts 9:16", kuerzel: "9x16", breit: 1080, hoch: 1920),
    Format(name: "Meta Feed 4:5", kuerzel: "4x5", breit: 1080, hoch: 1350),
    Format(name: "YouTube 16:9", kuerzel: "16x9", breit: 1920, hoch: 1080),
]

let PAPIER = NSColor(calibratedRed: 0.957, green: 0.937, blue: 0.886, alpha: 1)   // #f4efe2
let TINTE = NSColor(calibratedRed: 0.133, green: 0.125, blue: 0.106, alpha: 1)    // #22201b
/* ── DER RAHMEN IST GELB UND IMMER DA (Owner 18.09.2026: „der Rahmen muss aktiv sein · ich muss
   ihn immer sehen gelb") ──────────────────────────────────────────────────────────────────────
   Gelb, weil es auf jedem Untergrund steht — auf der cremefarbenen Seite, auf einem dunklen
   Editor, auf einem Foto. Tinte auf Creme verschwand genau dort, wo man den Rahmen braucht. */
let RAHMEN_GELB = NSColor(calibratedRed: 0.98, green: 0.76, blue: 0.16, alpha: 1)

// ── WELCHE NUMMER HAT WAS BEI FFMPEG ────────────────────────────────────────────────────────
// avfoundation kennt Geräte nur über ihre Nummer, und die Reihenfolge ist die von ffmpeg, nicht
// die von AVFoundation. Deshalb wird sie aus `-list_devices` gelesen und nicht geraten.
struct Geraet { let nr: Int; let name: String }

func ffmpegPfad() -> String {
    for p in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"] {
        if FileManager.default.isExecutableFile(atPath: p) { return p }
    }
    return "ffmpeg"
}

func lauf(_ pfad: String, _ argumente: [String]) -> String {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: pfad)
    p.arguments = argumente
    let rohr = Pipe()
    p.standardError = rohr
    p.standardOutput = rohr
    do { try p.run() } catch { return "" }
    let daten = rohr.fileHandleForReading.readDataToEndOfFile()
    p.waitUntilExit()
    return String(data: daten, encoding: .utf8) ?? ""
}

func geraeteLesen() -> (video: [Geraet], audio: [Geraet]) {
    let text = lauf(ffmpegPfad(), ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""])
    var video: [Geraet] = [], audio: [Geraet] = []
    var wo = ""
    for zeile in text.components(separatedBy: "\n") {
        if zeile.contains("AVFoundation video devices") { wo = "v"; continue }
        if zeile.contains("AVFoundation audio devices") { wo = "a"; continue }
        guard !wo.isEmpty else { continue }
        // Die Nummer ist die LETZTE Klammer der Zeile — vorne steht noch „[AVFoundation indev …]".
        guard let klammer = zeile.range(of: #"\[(\d+)\]\s*([^\[\]]+)$"#, options: .regularExpression) else { continue }
        let stueck = String(zeile[klammer])
        let zahl = stueck.components(separatedBy: CharacterSet(charactersIn: "[]")).first(where: { Int($0) != nil }) ?? ""
        guard let nr = Int(zahl) else { continue }
        let name = stueck.components(separatedBy: "]").dropFirst().joined(separator: "]").trimmingCharacters(in: .whitespaces)
        let g = Geraet(nr: nr, name: name)
        if wo == "v" { video.append(g) } else { audio.append(g) }
    }
    return (video, audio)
}

let istBildschirm: (Geraet) -> Bool = { $0.name.lowercased().contains("capture screen") }
// Auf diesem Rechner liegen acht Tongeräte, sieben davon virtuelle Kanäle von Zoom, Teams,
// Webex, AirBeamTV, Immersed. Nummer 0 ist also fast nie das Mikrofon.
let istVirtuell: (Geraet) -> Bool = { g in
    let n = g.name.lowercased()
    return ["zoom", "teams", "webex", "virtual", "airbeam", "immersed", "blackhole", "loopback", "speakers"].contains { n.contains($0) }
}

// ══ DER KAMERAKREIS ════════════════════════════════════════════════════════════════════════
// Ein randloses, schwebendes Fenster mit rundem Bild und cremefarbenem Ring — dieselbe
// Papierfarbe wie das Poster, damit der Film zum Haus gehört. Ziehen verschiebt ihn, das
// Mausrad macht ihn größer und kleiner.
final class KreisAnsicht: NSView {
    let vorschau = AVCaptureVideoPreviewLayer()

    /// Voll heißt: Das Bild füllt den ganzen Aufnahmerahmen — du bist ganz zu sehen
    /// (Owner 18.09.2026: „wenn ich auf dem Kreis drücke zum Vergrößern, dann bin ich full zu
    /// sehen, und verkleinern kann ich es auch").
    var voll = false { didSet { needsLayout = true; needsDisplay = true } }

    /// ── GESPIEGELT WIE EIN SPIEGEL (Owner 18.09.2026: „spiegeln auch") ─────────────────────
    /// Vorgabe AN. Wer sich selbst auf dem Schirm sieht, erwartet einen Spiegel: Hebt er die
    /// rechte Hand, soll sie rechts erscheinen. Ungespiegelt greift man beim Zeigen instinktiv
    /// in die falsche Richtung. Und weil dieser Kreis mit aufgenommen wird, gilt die Wahl auch
    /// für den Film — Schrift im Kamerabild (ein Blatt, das man hochhält) steht dann allerdings
    /// verkehrt: dafür ist der Haken auch abschaltbar.
    var gespiegelt = true { didSet { spiegelAnwenden() } }

    private func spiegelAnwenden() {
        vorschau.transform = gespiegelt ? CATransform3DMakeScale(-1, 1, 1) : CATransform3DIdentity
    }

    /// Der Klick vergrößert, das Ziehen verschiebt — unterschieden wird an der Strecke. Deshalb
    /// bewegt diese Ansicht das Fenster selbst, statt `performDrag` zu benutzen: `performDrag`
    /// kehrt erst zurück, wenn das Ziehen vorbei ist, und ein Klick wäre nicht mehr erkennbar.
    private var griff = NSPoint.zero
    private var gezogen = false
    private var letzteMaus = NSPoint.zero


    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.backgroundColor = .clear
        /* ── BEI JEDER GRÖSSENÄNDERUNG NEU ZEICHNEN (Owner 18.09.2026: „nach einmal Vergrößern
           ist der Rahmen wieder das, der komische") ───────────────────────────────────────────
           Eine ebenengestützte Ansicht behält ihre gemalte Fläche im Zwischenspeicher und lässt
           sie beim Wachsen STRECKEN. Aus der 1,5-pt-Haarlinie wurde dabei ein dicker Ring, und
           der gezeichnete runde Schatten wurde zu der eckigen Form, über die der Owner zweimal
           gestolpert ist. Mit dieser Richtlinie wird stattdessen neu gemalt. */
        layerContentsRedrawPolicy = .duringViewResize
        vorschau.videoGravity = .resizeAspectFill
        layer?.addSublayer(vorschau)
        spiegelAnwenden()
    }
    required init?(coder: NSCoder) { fatalError() }

    /* Zwei verschiedene Dinge, die vorher eines waren (Owner 18.09.2026: „zu fett"):
       `schattenLuft` ist unsichtbarer Rand im Fenster, damit der gezeichnete Schatten Platz hat.
       `ring` ist der sichtbare Papierrand um das Bild. Als ich für den Schatten Luft schuf, wuchs
       der Ring mit — und der Kreis sah aus wie ein Rettungsring. */
    private static let schattenLuft: CGFloat = 6
    /* Von 5 über 3 auf 1,5 (Owner 18.09.2026, zweimal: „zu fett" · „immer noch zu dick"): Der
       Ring soll das Gesicht nur vom Hintergrund trennen, nicht selbst auffallen. Auf einem
       Retina-Schirm ist 1,5 pt eine saubere Haarlinie. */
    private static let ring: CGFloat = 1.5

    /// Die sichtbare Form — Scheibe oder Blatt. Eine Quelle für Zeichnen und Zuschnitt.
    private var formRect: NSRect {
        let l = KreisAnsicht.schattenLuft
        if voll { return bounds.insetBy(dx: l, dy: l) }
        let d = min(bounds.width, bounds.height) - 2 * l
        return NSRect(x: l, y: l, width: d, height: d)
    }

    /* ── EINE ECHTE MASKE, KEINE RUNDEN ECKEN (Owner 18.09.2026: „siehst du die dünne Linie um
       den Kreis? Es ist ein Quadrat") ───────────────────────────────────────────────────────────
       Die Kameravorschau ist ein QUADRATISCHES Ebenenfeld. `cornerRadius` + `masksToBounds`
       macht daraus optisch einen Kreis — aber der Videoinhalt liegt in einer eigenen Unterebene,
       und die hält sich nicht immer an die runden Ecken: Die Kante des Quadrats blieb als
       Haarlinie stehen. Eine `mask`-Ebene beschneidet den ganzen Ebenenbaum und lässt keine Kante
       übrig. */
    private let maske = CAShapeLayer()

    override func layout() {
        super.layout()
        /* Die Form hängt an der Größe, also nach jeder Größenänderung neu zeichnen. */
        needsDisplay = true
        let bild = formRect.insetBy(dx: KreisAnsicht.ring, dy: KreisAnsicht.ring)
        vorschau.frame = bild
        vorschau.cornerRadius = 0
        vorschau.masksToBounds = false

        let skala = window?.backingScaleFactor ?? 2
        maske.frame = vorschau.bounds
        maske.contentsScale = skala
        maske.path = voll
            ? CGPath(roundedRect: vorschau.bounds, cornerWidth: 12, cornerHeight: 12, transform: nil)
            : CGPath(ellipseIn: vorschau.bounds, transform: nil)
        maske.fillColor = NSColor.black.cgColor
        vorschau.mask = maske

        spiegelAnwenden()
    }

    override func draw(_ dirty: NSRect) {
        PAPIER.setFill()
        if voll {
            let blatt = NSBezierPath(roundedRect: bounds, xRadius: 18, yRadius: 18)
            blatt.fill()
        } else {
            let d = min(bounds.width, bounds.height)
            NSBezierPath(ovalIn: NSRect(x: 0, y: 0, width: d, height: d)).fill()
        }

    }



    override func mouseDown(with event: NSEvent) {
        gezogen = false
        letzteMaus = NSEvent.mouseLocation
        griff = NSEvent.mouseLocation
        if let w = window { griff = NSPoint(x: griff.x - w.frame.origin.x, y: griff.y - w.frame.origin.y) }
    }

    override func mouseDragged(with event: NSEvent) {
        guard let f = window as? KreisFenster else { return }
        gezogen = true
        let maus = NSEvent.mouseLocation

        /* ── ZIEHEN AM KREIS VERSCHIEBT DEN KREIS (Owner 18.09.2026: „oder schieben · noch
           besser · den Kreis schieben") ──────────────────────────────────────────────────────
           Kurz davor zog der Kreis den ganzen Rahmen — auf Wunsch des Owners, weil er die
           bequemste Fläche ist. Beim Arbeiten hat sich aber gezeigt, was man WIRKLICH oft tut:
           den Kreis umsetzen, weil er gerade den Knopf verdeckt, den man erklärt. Der Rahmen
           steht dagegen einmal und bleibt.
           Also: Ziehen = Kreis (die häufige Absicht, ohne Zusatztaste), ⌥ziehen = Rahmen, und
           für den Millimeter das aufklappbare 3×3-Feld am ◱. */
        if !event.modifierFlags.contains(.option), !voll {
            f.verschiebenAuf(NSPoint(x: maus.x - griff.x, y: maus.y - griff.y))
            return
        }
        /* Verschoben wird um die Strecke der Maus seit dem letzten Bild — nicht auf eine
           absolute Stelle: So bleibt der Rahmen unter dem Finger, egal wo man ihn gegriffen hat. */
        if letzteMaus != .zero {
            f.rahmenZiehen(maus.x - letzteMaus.x, maus.y - letzteMaus.y)
        }
        letzteMaus = maus
    }

    override func mouseUp(with event: NSEvent) {
        /* ── NUR DOPPELKLICK SCHALTET UM (Owner 18.09.2026: „was ist das für eine Form? Es ist
           kein Kreis") ──────────────────────────────────────────────────────────────────────
           Vorher genügte ein einzelner Klick. Da man am Kreis aber ZIEHT, um den Rahmen zu
           verschieben, wurde jeder Zug ohne Bewegung als Klick gewertet — und aus dem Kreis
           wurde unversehens das Rechteck. Ziehen und Umschalten dürfen nicht dieselbe Geste
           sein. */
        guard !gezogen, event.clickCount >= 2, let f = window as? KreisFenster else { return }
        f.vollUmschalten()
    }

    /// Damit `mouseMoved` überhaupt ankommt, muss das Fenster die Bewegungen annehmen.
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        window?.acceptsMouseMovedEvents = true
        /* Sicherheitshalber auch hier: Ein einmal berechneter rechteckiger Schatten bleibt sonst
           am Fenster hängen, obwohl `hasShadow` aus ist (Owner 18.09.2026: „komische Form unterm
           Kreis"). */
        window?.invalidateShadow()
    }

    /// Das Mausrad bestimmt die Größe — stufenlos, damit der Kreis genau so groß wird, wie er
    /// im Bild sein soll.
    override func scrollWheel(with event: NSEvent) {
        guard let f = window as? KreisFenster, !voll else { return }
        f.groesseAendern(um: event.scrollingDeltaY * 3)
    }
}

/* Eine Quelle für die Mindestgröße (Owner 18.09.2026: „ich verkleinere den Kreis, und wenn ich
   den Rahmen verschiebe, dann vergrößert sich wieder"): Beim Verkleinern stand 120, beim
   Nachziehen 140 — der Kreis wuchs beim nächsten Rahmenzug also von selbst auf 140. Zwei Zahlen
   für dieselbe Grenze sind immer ein Fehler, der erst beim Benutzen auffällt. */
let KREIS_MIN: CGFloat = 120

final class KreisFenster: NSPanel, NSWindowDelegate {
    let ansicht: KreisAnsicht
    private let sitzung = AVCaptureSession()
    /// Woher der Kreis weiß, wie groß „voll" ist: die Fläche im Aufnahmerahmen.
    var vollFlaeche: () -> NSRect = { .zero }

    /* ── DER KREIS GEHÖRT IN DEN RAHMEN (Owner 18.09.2026: „der Kreis darf nicht außerhalb sein,
       muss sich immer mit dem Rahmen bewegen") ───────────────────────────────────────────────
       Gemerkt wird NICHT seine Stelle auf dem Bildschirm, sondern seine Stelle IM Rahmen: der
       Mittelpunkt als Anteil der Rahmenfläche (0…1) und der Durchmesser als Anteil der
       Rahmenbreite. Damit sitzt er nach jedem Verschieben, jeder Größenänderung und jedem
       Formatwechsel wieder an derselben Stelle des Bildes — und was du siehst, ist, was im Film
       steht. Absolute Bildschirmpunkte würden bei jedem Rahmenzug aus dem Bild wandern. */
    private var anker = CGPoint(x: 0.16, y: 0.16)
    private var anteilGroesse: CGFloat = 0.30
    /// Wohin er zurückkehrt, wenn man ihn wieder klein macht.
    private var vorher: NSRect?
    /// Wird gerufen, wenn sich etwas ändert — das Steuerfenster zeigt dann die Größe an.
    var geaendert: () -> Void = {}
    /// Verschiebt den ganzen Aufnahmerahmen um diese Strecke (siehe `mouseDragged` im Kreis).
    var rahmenZiehen: (CGFloat, CGFloat) -> Void = { _, _ in }
    /// Die drei Knöpfe hängen am Kreis und bekommen nach jeder Bewegung seine neue Lage.
    var knoepfeFolgen: (NSRect) -> Void = { _ in }

    init(groesse: CGFloat) {
        ansicht = KreisAnsicht(frame: NSRect(x: 0, y: 0, width: groesse, height: groesse))
        super.init(contentRect: NSRect(x: 80, y: 120, width: groesse, height: groesse),
                   styleMask: [.borderless, .nonactivatingPanel],
                   backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        level = .floating
        /* Das Verschieben macht die Ansicht selbst (sonst wäre ein Klick nicht vom Ziehen zu
           unterscheiden — und der Klick ist das Vergrößern). */
        isMovableByWindowBackground = false
        delegate = self
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        contentView = ansicht
    }

    var istVoll: Bool { ansicht.voll }

    /* Ob der Kreis von Hand gezogen, per Ecke gesetzt oder vom Rahmen mitgenommen wurde: Die
       Knöpfe hängen an ihm und werden hier nachgezogen — an EINER Stelle, nicht an fünf. */
    func windowDidMove(_ note: Notification) { knoepfeFolgen(frame) }
    func windowDidResize(_ note: Notification) { invalidateShadow(); knoepfeFolgen(frame) }

    /// Die Maße des Rahmens beim letzten Nachziehen — daran erkennt der Kreis, ob der Rahmen nur
    /// verschoben oder auch skaliert wurde.
    private var letzteInnen: NSSize = .zero

    /* ── DER RAHMEN WANDERT, DER KREIS BLEIBT WIE ER IST (Owner 18.09.2026) ──────────────────
       Hier lagen zwei Fehler übereinander:
       1. Die Größe wurde bei JEDEM Rahmenzug aus `anteilGroesse` neu gerechnet — mit einer
          anderen Untergrenze als beim Verkleinern (140 statt 120). Ein verkleinerter Kreis wuchs
          dadurch beim nächsten Verschieben von selbst zurück.
       2. Auch die Lage wurde neu gesetzt, statt den Kreis einfach mitzunehmen — bei Rundungen
          rutschte er dabei um ein paar Punkte.
       Jetzt: Beim reinen VERSCHIEBEN wandert der Kreis um dieselbe Strecke mit, nichts wird
       gerechnet. Nur wenn der Rahmen seine GRÖSSE ändert, werden Anteil und Anker angewandt —
       dort ist Umrechnen unvermeidlich, weil sich die Fläche ändert. */
    func nachRahmen() {
        let innen = vollFlaeche()
        guard innen.width > 10 else { return }
        if ansicht.voll { setFrame(innen, display: true); letzteInnen = innen.size; return }

        if letzteInnen == innen.size {
            /* Reines Verschieben: Der Kreis behält Größe und relative Lage, weil er um genau die
               Strecke mitgeht, die auch der Rahmen gegangen ist. */
            let mx = innen.minX + anker.x * innen.width
            let my = innen.minY + anker.y * innen.height
            let d = frame.width
            setFrame(begrenzt(NSRect(x: mx - d / 2, y: my - d / 2, width: d, height: d), in: innen), display: false)
            knoepfeFolgen(frame)
            return
        }

        /* Der Rahmen hat seine Größe geändert: Durchmesser als Anteil der Rahmenbreite, nie
           größer als die kürzere Seite und nie kleiner als die eine Mindestgröße. */
        let deckel = min(innen.width, innen.height) - 8
        let d = max(KREIS_MIN, min(anteilGroesse * innen.width, deckel))
        let mx = innen.minX + anker.x * innen.width
        let my = innen.minY + anker.y * innen.height
        letzteInnen = innen.size
        setFrame(begrenzt(NSRect(x: mx - d / 2, y: my - d / 2, width: d, height: d), in: innen), display: true)
        geaendert()
    }

    /// Kein Stück des Kreises darf über den Rahmen hinausstehen.
    private func begrenzt(_ r: NSRect, in innen: NSRect) -> NSRect {
        var f = r
        f.size.width = min(f.width, innen.width)
        f.size.height = f.width
        f.origin.x = min(max(innen.minX, f.origin.x), innen.maxX - f.width)
        f.origin.y = min(max(innen.minY, f.origin.y), innen.maxY - f.height)
        return f
    }

    /// Nach einem Zug oder einer Größenänderung durch die Hand: den Anker nachziehen.
    func ankerMerken() {
        let innen = vollFlaeche()
        guard innen.width > 10, !ansicht.voll else { return }
        anker = CGPoint(x: (frame.midX - innen.minX) / innen.width,
                        y: (frame.midY - innen.minY) / innen.height)
        anteilGroesse = frame.width / innen.width
    }

    /// Verschiebt den Kreis, aber nur innerhalb des Rahmens.
    func verschiebenAuf(_ punkt: NSPoint) {
        let innen = vollFlaeche()
        let ziel = NSRect(x: punkt.x, y: punkt.y, width: frame.width, height: frame.height)
        setFrame(innen.width > 10 ? begrenzt(ziel, in: innen) : ziel, display: true)
        ankerMerken()
        geaendert()
    }

    func vollUmschalten() {
        if ansicht.voll {
            ansicht.voll = false
            /* Zurück auf die gemerkte Größe — und wenn die fehlt, auf einen runden Kreis in
               vernünftiger Größe, nie auf ein Rechteck. */
            setFrame(vorher ?? NSRect(x: frame.minX, y: frame.minY, width: 220, height: 220), display: true)
            nachRahmen()
        } else {
            let flaeche = vollFlaeche()
            /* KEIN Formwechsel ohne Fläche (Fehler vom 18.09.2026): Vorher wurde erst die Form
               umgestellt und die neue Größe nur „wenn möglich" gesetzt — ohne Rahmenfläche blieb
               ein Rechteck in Kreisgröße stehen, und das ist die Form, über die der Owner
               gestolpert ist. */
            guard flaeche.width > 10 else { return }
            vorher = frame
            ansicht.voll = true
            setFrame(flaeche, display: true)
        }
        geaendert()
    }

    func groesseAendern(um schritt: CGFloat) {
        let innen = vollFlaeche()
        /* Größer als der Rahmen darf er nicht werden — sonst stünde er zwangsläufig draußen. */
        let deckel = innen.width > 10 ? min(innen.width, innen.height) - 8 : 720
        let neu = max(KREIS_MIN, min(deckel, frame.width + schritt))
        /* Die Mitte bleibt stehen — sonst wandert der Kreis beim Verkleinern aus der Ecke. */
        let mx = frame.midX, my = frame.midY
        let ziel = NSRect(x: mx - neu / 2, y: my - neu / 2, width: neu, height: neu)
        setFrame(innen.width > 10 ? begrenzt(ziel, in: innen) : ziel, display: true)
        ankerMerken()
        geaendert()
    }

    func groesseSetzen(_ d: CGFloat) {
        guard !ansicht.voll else { return }
        groesseAendern(um: d - frame.width)
    }

    /* ── EIN KNOPF SCHICKT DEN KREIS DURCH DIE PLÄTZE (Owner 18.09.2026: „die Positionierung
       des Kreises auch über den Plus-Button machen") ──────────────────────────────────────────
       Seit das Ziehen am Kreis den ganzen RAHMEN verschiebt, braucht das Platzieren des Kreises
       sonst die ⌥-Taste — das merkt sich niemand mitten im Sprechen. Ein Druck rückt ihn zum
       nächsten Platz: unten links → unten rechts → oben rechts → oben links → Mitte und wieder
       von vorn. Fünf Plätze, ein Knopf, kein Zielen. */
    private var platz = 0

    /* Neun Plätze in der Aufnahmefläche: Spalte 0…2 von links, Zeile 0…2 von oben. Der Kreis
       behält seine Größe, es ändert sich nur, wo er sitzt. */
    func anPlatz(spalte: Int, zeile: Int, luft: CGFloat = 24) {
        guard !ansicht.voll else { return }
        let f = vollFlaeche()
        guard f.width > 10 else { return }
        let d = frame.width
        let xs: [CGFloat] = [f.minX + luft, f.midX - d / 2, f.maxX - d - luft]
        let ys: [CGFloat] = [f.maxY - d - luft, f.midY - d / 2, f.minY + luft]
        setFrame(NSRect(x: xs[max(0, min(2, spalte))], y: ys[max(0, min(2, zeile))], width: d, height: d), display: true)
        ankerMerken()
        geaendert()
    }

    func naechsterPlatz() {
        guard !ansicht.voll else { return }
        platz = (platz + 1) % 5
        if platz == 4 {
            let f = vollFlaeche()
            guard f.width > 10 else { return }
            let d = frame.width
            setFrame(NSRect(x: f.midX - d / 2, y: f.midY - d / 2, width: d, height: d), display: true)
            ankerMerken()
            geaendert()
        } else {
            inEcke(platz)
        }
    }

    /// Die vier Ecken der Aufnahmefläche — mit Abstand, damit der Kreis nicht am Rand klebt.
    func inEcke(_ ecke: Int, luft: CGFloat = 24) {
        guard !ansicht.voll else { return }
        let f = vollFlaeche()
        guard f.width > 10 else { return }
        let d = frame.width
        let x = (ecke == 0 || ecke == 2) ? f.minX + luft : f.maxX - d - luft
        let y = (ecke == 0 || ecke == 1) ? f.minY + luft : f.maxY - d - luft
        setFrame(begrenzt(NSRect(x: x, y: y, width: d, height: d), in: f), display: true)
        ankerMerken()
        geaendert()
    }

    // Ein randloses Fenster gilt normalerweise als nicht „key" — ohne das hier schluckt es
    // Mausrad-Ereignisse nicht.
    override var canBecomeKey: Bool { true }

    func kameraStarten(_ geraet: AVCaptureDevice?) {
        sitzung.stopRunning()
        sitzung.inputs.forEach { sitzung.removeInput($0) }
        guard let geraet, let eingang = try? AVCaptureDeviceInput(device: geraet) else { return }
        sitzung.beginConfiguration()
        if sitzung.canAddInput(eingang) { sitzung.addInput(eingang) }
        sitzung.commitConfiguration()
        ansicht.vorschau.session = sitzung
        DispatchQueue.global(qos: .userInitiated).async { [sitzung] in sitzung.startRunning() }
    }
}

// ══ DER AUFNAHMERAHMEN ═════════════════════════════════════════════════════════════════════
// Zeichnet nur einen Strich — AUSSERHALB der Fläche, die aufgenommen wird, sonst wäre er im
// Film. Ist „verschieben" aus, gehen alle Klicks durch ihn hindurch.
final class RahmenAnsicht: NSView {
    var beschriftung = ""
    /* ── DER STREIFEN IST BREIT GENUG FÜR EINEN FINGER (Owner 18.09.2026: „mach den Rahmen
       breiter, damit ich greifen kann und verschieben kann") ────────────────────────────────
       18 Punkte statt 6: Ein 6-Punkt-Strich ist mit der Maus ein Zufallstreffer, und man landet
       ständig in der Mitte, die durchlässig ist. Der Streifen liegt AUSSERHALB der
       Aufnahmefläche — er ist also nicht im Film, egal wie breit er ist. */
    static let kante: CGFloat = 18

    override func draw(_ dirty: NSRect) {
        let k = RahmenAnsicht.kante
        let innen = bounds.insetBy(dx: k, dy: k)

        /* Der ganze Streifen ist gelb und damit sichtbar UND greifbar — nicht nur eine Linie.
           Halb durchsichtig, damit man sieht, was darunter liegt, wenn man ihn über ein Fenster
           schiebt. */
        RAHMEN_GELB.withAlphaComponent(0.55).setFill()
        let band = NSBezierPath(rect: bounds)
        band.append(NSBezierPath(rect: innen))
        band.windingRule = .evenOdd
        band.fill()

        /* Zwei kräftige Kanten: außen und an der Aufnahmegrenze — die innere sagt genau, was im
           Film ist. */
        RAHMEN_GELB.setStroke()
        for (rechteck, breite) in [(bounds.insetBy(dx: 1, dy: 1), CGFloat(2)), (innen, CGFloat(2))] {
            let p = NSBezierPath(rect: rechteck)
            p.lineWidth = breite
            p.stroke()
        }

        /* Der Griff in der Ecke unten rechts — drei Striche, wie überall auf dem Mac. */
        TINTE.withAlphaComponent(0.55).setStroke()
        for i in 0..<3 {
            let v = CGFloat(i) * 5 + 4
            let p = NSBezierPath()
            p.move(to: NSPoint(x: bounds.maxX - v, y: bounds.minY + 2))
            p.line(to: NSPoint(x: bounds.maxX - 2, y: bounds.minY + v))
            p.lineWidth = 1.5
            p.stroke()
        }

        guard !beschriftung.isEmpty else { return }
        let text = beschriftung as NSString
        let stil: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 11, weight: .semibold),
            .foregroundColor: TINTE,
            .backgroundColor: RAHMEN_GELB,
        ]
        /* Die Beschriftung sitzt IM gelben Streifen oben links — dort ist sie zu lesen und
           gleichzeitig außerhalb der Aufnahmefläche. */
        text.draw(at: NSPoint(x: innen.minX + 4, y: innen.maxY + 2), withAttributes: stil)
    }

}

final class RahmenFenster: NSPanel, NSWindowDelegate {
    let ansicht = RahmenAnsicht()
    /// Wird gerufen, wenn der Rahmen verschoben oder in der Größe geändert wurde — der Kreis
    /// zieht dann mit (Owner 18.09.2026).
    var bewegt: () -> Void = {}
    /// Die Griffe außen hängen am Rahmen und bekommen nach jeder Bewegung seine neue Lage.
    var griffeFolgen: (NSRect) -> Void = { _ in }

    init() {
        /* OHNE `.resizable` (Owner 18.09.2026: „ich kann den Rahmen gerade nicht verschieben, nur
           verziehen"): Bei einem randlosen Fenster mit `.resizable` behandelt macOS JEDEN Zug an
           der Kante selbst als Größenänderung — und die Kante ist hier die ganze greifbare
           Fläche. Der Zug kam deshalb nie in `mouseDragged` an. Größe macht jetzt allein der
           Griff in der Ecke unten rechts, und der hält das Seitenverhältnis. */
        super.init(contentRect: NSRect(x: 200, y: 120, width: 420, height: 747),
                   styleMask: [.borderless, .nonactivatingPanel],
                   backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        /* ── DAS RAHMENFENSTER FÄNGT NIE EINEN KLICK (Owner 18.09.2026: „ich kann im Fenster
           nicht klicken, also wenn ich den Bildschirm aufnehme, kann ich dort nicht rumklicken")
           ──────────────────────────────────────────────────────────────────────────────────────
           Vorher sollte `hitTest` in der Mitte `nil` liefern und den Klick weiterreichen. Bei
           einem schwebenden Panel ist darauf kein Verlass — das Fenster hat die Klicks
           geschluckt, und damit war die Seite nicht mehr bedienbar. Genau das ist bei einem
           Aufnahmewerkzeug der Totalausfall: Man nimmt auf, um etwas zu zeigen.
           Jetzt ist das Fenster GANZ durchlässig, und Verschieben, Größe und Schliessen sitzen in
           eigenen kleinen Fenstern AUSSEN am Rahmen (`RahmenKnoepfe`) — dort, wo sie niemandem
           im Weg sind und nicht im Film landen. */
        ignoresMouseEvents = true
        contentView = ansicht
        delegate = self
    }

    private var verhaeltnis: CGFloat = 1080.0 / 1920.0

    /// Neue Höhe, Breite folgt dem Format. Der obere Rand bleibt stehen, damit der Rahmen beim
    /// Ziehen nicht unter der Hand wegläuft.
    func aufHoehe(_ hoehe: CGFloat) {
        let breite = (hoehe * verhaeltnis).rounded()
        let oben = frame.maxY
        setFrame(NSRect(x: frame.origin.x, y: oben - hoehe, width: breite, height: hoehe), display: true)
    }

    func windowDidMove(_ note: Notification) { bewegt(); griffeFolgen(frame) }
    func windowDidResize(_ note: Notification) { beschriftungAuffrischen(); bewegt(); griffeFolgen(frame) }

    private func beschriftungAuffrischen() {
        ansicht.beschriftung = "\(Int(innenRect.width))×\(Int(innenRect.height)) pt"
        ansicht.needsDisplay = true
    }

    override var canBecomeKey: Bool { true }

    /// Die Fläche IM Rahmen — das ist, was aufgenommen wird (der gelbe Strich liegt außen).
    var innenRect: NSRect { frame.insetBy(dx: RahmenAnsicht.kante, dy: RahmenAnsicht.kante) }

    func aufFormat(_ f: Format) {
        verhaeltnis = f.verhaeltnis
        aufHoehe(frame.height)
        ansicht.beschriftung = "\(f.name) · \(Int(innenRect.width))×\(Int(innenRect.height)) pt"
        ansicht.needsDisplay = true
    }
}

/* ── DIE ERLAUBNIS MUSS DIE APP SELBST HOLEN ─────────────────────────────────────────────────
   (Owner 18.09.2026, mit Bild der Systemeinstellungen: „ich kann das nicht freigeben, es
   erscheint nicht als Software.")

   Vorher hat nur der ffmpeg-Prozess aufgenommen, den die App startet. macOS hat die App dann in
   die Liste geschrieben, aber GRAU und nicht schaltbar: Ein Eintrag, den ein Kindprozess
   ausgelöst hat, ist für das System keine Anfrage der App. Der Schalter lässt sich nicht
   umlegen, und die Aufnahme bleibt schwarz.

   `CGRequestScreenCaptureAccess()` ist der dokumentierte Weg: Die App selbst fragt, macOS zeigt
   seinen Dialog, der Eintrag entsteht richtig und ist schaltbar. `CGPreflight…` fragt nur nach
   dem Stand, ohne Dialog — damit kann die App VOR dem Start sagen, dass etwas fehlt, statt nach
   einer Minute Sprechen eine schwarze Datei zu liefern. */
func bildschirmErlaubt() -> Bool { CGPreflightScreenCaptureAccess() }

@discardableResult
func bildschirmErlaubnisFragen() -> Bool { CGRequestScreenCaptureAccess() }

/// Führt direkt auf die Seite in den Systemeinstellungen — Suchen in drei Ebenen ist verlorene Zeit.
func einstellungenOeffnen() {
    if let u = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
        NSWorkspace.shared.open(u)
    }
}

/// Ein Fehler mit lesbarem Text — `String` allein darf kein `Result`-Fehler sein.
struct Panne: Error { let text: String }

// ══ DIE AUFNAHME ═══════════════════════════════════════════════════════════════════════════
final class Aufnahme {
    private var prozess: Process?
    private var rohDatei: URL?
    private var ordner: URL

    /* ── WOHIN DIE FILME GEHEN (Owner 18.09.2026: „wo speichert er die Filme, das muss ich auch
       bestimmen können") ───────────────────────────────────────────────────────────────────────
       Vorgabe ist `~/Movies/Werbefilm`, aber die Wahl gehört dem Owner — und sie überlebt den
       Neustart, sonst trägt er sie jeden Morgen neu ein. Gemerkt wird der Pfad, nicht ein
       Lesezeichen: Die App ist nicht in der Sandbox, sie darf überall schreiben, wo der Benutzer
       darf. */
    private static let merker = "ausgabeOrdner"

    init() {
        let vorgabe = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Movies/Werbefilm")
        if let gemerkt = UserDefaults.standard.string(forKey: Aufnahme.merker), !gemerkt.isEmpty {
            ordner = URL(fileURLWithPath: gemerkt)
        } else {
            ordner = vorgabe
        }
        try? FileManager.default.createDirectory(at: ordner, withIntermediateDirectories: true)
        /* Ist der gemerkte Ordner weg (externe Platte abgezogen, Ordner gelöscht), fällt die App
           auf die Vorgabe zurück, statt beim Stoppen an einer nicht schreibbaren Stelle zu
           scheitern — und dann ist die Aufnahme verloren. */
        if !FileManager.default.isWritableFile(atPath: ordner.path) {
            ordner = vorgabe
            try? FileManager.default.createDirectory(at: ordner, withIntermediateDirectories: true)
        }
    }

    var ausgabeOrdner: URL { ordner }

    /// Baut die letzte Rohaufnahme neu — nur der Ton-Versatz (oder das Format) ändert sich.
    func nochmalBauen(rect: NSRect, schirm: NSScreen, format: Format, tonVersatzMs: Int,
                      fertig: @escaping (Result<URL, Panne>) -> Void) {
        guard let roh = letzteRoh, FileManager.default.fileExists(atPath: roh.path) else {
            fertig(.failure(Panne(text: "Es liegt keine Rohaufnahme mehr — dafür einmal neu aufnehmen.")))
            return
        }
        rohDatei = roh
        prozess = nil
        /* Derselbe Weg wie beim Stoppen: ein Prozess, der schon beendet ist, wird nur
           übersprungen. */
        stoppenUndBauenIntern(roh: roh, rect: rect, schirm: schirm, format: format,
                              tonVersatzMs: tonVersatzMs, fertig: fertig)
    }

    func ordnerSetzen(_ neu: URL) {
        ordner = neu
        try? FileManager.default.createDirectory(at: neu, withIntermediateDirectories: true)
        UserDefaults.standard.set(neu.path, forKey: Aufnahme.merker)
    }
    var laeuft: Bool { prozess?.isRunning ?? false }

    /* ── DIE ROHAUFNAHME LIEGT IM UNTERORDNER `roh` (Owner 18.09.2026: „wtf, der nimmt alles
       auf, nicht nur was innerhalb der Rahmen ist") ──────────────────────────────────────────
       Sie IST der ganze Bildschirm, und das ist Absicht: avfoundation kann nicht auf ein Fenster
       zuschneiden, der Zuschnitt passiert beim Bauen. Vorteil: Verschiebst du den Rahmen mitten
       in der Aufnahme, ist nichts verloren.
       Aber sie hat zwischen den fertigen Filmen nichts zu suchen — dort greift man sie
       versehentlich und hält sie für das Ergebnis. Also eigener Unterordner, und beim Start einer
       neuen Aufnahme fliegen alle alten heraus (eine Minute sind schnell 200 MB). */
    private var rohOrdner: URL {
        let u = ordner.appendingPathComponent("roh", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    func starten(bildschirmNr: Int, mikroNr: Int) -> String? {
        letzteRoh = nil
        for alt in (try? FileManager.default.contentsOfDirectory(at: rohOrdner, includingPropertiesForKeys: nil)) ?? [] {
            try? FileManager.default.removeItem(at: alt)
        }
        /* Und die Altlasten aus der Zeit, als sie noch neben den Filmen lagen. */
        for alt in (try? FileManager.default.contentsOfDirectory(at: ordner, includingPropertiesForKeys: nil)) ?? []
        where alt.lastPathComponent.hasPrefix("roh-") {
            try? FileManager.default.removeItem(at: alt)
        }
        let ziel = rohOrdner.appendingPathComponent("roh-\(Int(Date().timeIntervalSince1970)).mov")
        let p = Process()
        p.executableURL = URL(fileURLWithPath: ffmpegPfad())
        p.arguments = [
            "-y", "-hide_banner", "-loglevel", "warning",
            "-f", "avfoundation", "-framerate", "30", "-capture_cursor", "1",
            "-i", "\(bildschirmNr):\(mikroNr)",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            ziel.path,
        ]
        let ein = Pipe(), fehler = Pipe()
        p.standardInput = ein
        p.standardError = fehler
        do { try p.run() } catch { return "ffmpeg lässt sich nicht starten: \(error.localizedDescription)" }
        prozess = p
        rohDatei = ziel
        return nil
    }

    /// Stoppt und rechnet: Zuschnitt auf den Rahmen, Zielmaße, MP4. Gibt die fertige Datei zurück.
    /// Die letzte Rohaufnahme — sie bleibt liegen, damit man mit einem anderen Ton-Versatz neu
    /// bauen kann, ohne noch einmal zu sprechen.
    private(set) var letzteRoh: URL?

    func stoppenUndBauen(rect: NSRect, schirm: NSScreen, format: Format, tonVersatzMs: Int,
                         fertig: @escaping (Result<URL, Panne>) -> Void) {
        guard let p = prozess, let roh = rohDatei else { fertig(.failure(Panne(text: "Es läuft keine Aufnahme."))); return }
        if let ein = p.standardInput as? Pipe {
            // „q" statt `kill`: ffmpeg schreibt sonst keinen Abschluss, und die Datei ist kaputt.
            ein.fileHandleForWriting.write("q".data(using: .utf8)!)
        }
        prozess = nil
        DispatchQueue.global(qos: .userInitiated).async {
            p.waitUntilExit()
            DispatchQueue.main.async {
                self.stoppenUndBauenIntern(roh: roh, rect: rect, schirm: schirm, format: format,
                                           tonVersatzMs: tonVersatzMs, fertig: fertig)
            }
        }
    }

    /// Der Rechenweg — geteilt von „Stopp und bauen" und „nochmal bauen".
    private func stoppenUndBauenIntern(roh: URL, rect: NSRect, schirm: NSScreen, format: Format,
                                       tonVersatzMs: Int,
                                       fertig: @escaping (Result<URL, Panne>) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {

            // Punkte → Pixel, und der Ursprung wandert von unten links nach oben links.
            let skala = schirm.backingScaleFactor
            let sh = schirm.frame.height
            let x = Int((rect.origin.x - schirm.frame.origin.x) * skala)
            let y = Int((sh - (rect.origin.y - schirm.frame.origin.y) - rect.height) * skala)
            let b = Int(rect.width * skala)
            let h = Int(rect.height * skala)

            /* Der fertige Film gehört in den Ausgabeordner, nicht neben die Rohaufnahme. */
            let ziel = self.ordner
                .appendingPathComponent("werbefilm-\(format.kuerzel)-\(Int(Date().timeIntervalSince1970)).mp4")
            let filter = "crop=\(max(2, b)):\(max(2, h)):\(max(0, x)):\(max(0, y))," +
                "scale=\(format.breit):\(format.hoch):force_original_aspect_ratio=increase," +
                "crop=\(format.breit):\(format.hoch),setsar=1,format=yuv420p"
            /* ── DER TON KOMMT ZU FRÜH (Owner 18.09.2026: „es gibt eine Asynchronisation
               zwischen Stimme und Lippenbewegung") ───────────────────────────────────────────
               Das Gesicht läuft durch Kamera → Vorschau → Bildschirm → Aufnahme und ist dadurch
               ein Zehntel bis ein Drittel einer Sekunde ALT. Die Stimme geht direkt vom Mikrofon
               in dieselbe Datei und ist neu. Also wird der Ton um genau diesen Betrag nach
               hinten geschoben (`adelay` legt Stille davor) — nicht das Bild nach vorn, das
               ginge nur, indem man den Anfang abschneidet.
               Der Betrag hängt an Kamera und Rechner, deshalb ist er einstellbar; 180 ms sind
               der Erfahrungswert einer FaceTime-Kamera. */
            let tonFilter = tonVersatzMs > 0 ? ["-af", "adelay=\(tonVersatzMs):all=1"] : []
            let text = lauf(ffmpegPfad(), [
                "-y", "-hide_banner", "-i", roh.path,
                "-vf", filter,
            ] + tonFilter + [
                "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                ziel.path,
            ])
            DispatchQueue.main.async {
                if FileManager.default.fileExists(atPath: ziel.path) {
                    /* Die Rohaufnahme BLEIBT: Wer den Versatz nachjustiert, soll nicht neu
                       sprechen müssen. Sie wird beim nächsten Start einer Aufnahme aufgeräumt. */
                    self.letzteRoh = roh
                    fertig(.success(ziel))
                } else {
                    fertig(.failure(Panne(text: "ffmpeg hat nichts geschrieben: \(text.suffix(300))")))
                }
            }
        }
    }
}

// ══ DER HINTERGRUND ═══════════════════════════════════════════════════════════════════════
// (Owner 18.09.2026: „kann ich meinen Hintergrund ändern, weich machen oder einen Studio-BG
// wählen?")
//
// ── WARUM ER EIN FENSTER IST UND KEIN FILTER ────────────────────────────────────────────────
//
// Die App nimmt den ECHTEN Bildschirm auf. Ein Hintergrund, den sie erst beim Rechnen einsetzt,
// wäre beim Sprechen nicht zu sehen — und man würde das Browserfenster daneben schieben, ohne
// zu merken, dass die Fläche halb leer ist. Also liegt er als eigenes Fenster IM Rahmen, unter
// den normalen Fenstern und über dem Schreibtisch: Chrome liegt darauf, der Kreis darüber, und
// die Aufnahme nimmt alles zusammen. Was du siehst, ist der Film.
//
// Der Schreibtisch mit seinen Symbolen und halben Fenstern ist der häufigste Grund, warum eine
// Bildschirmaufnahme wie eine Bildschirmaufnahme aussieht und nicht wie eine Anzeige.
enum HintergrundArt: Int, CaseIterable {
    case keiner, papier, dunkel, verlauf, bild

    var name: String {
        switch self {
        case .keiner: return "keiner (Schreibtisch)"
        case .papier: return "Creme (wie die Seite)"
        case .dunkel: return "Studio dunkel"
        case .verlauf: return "Verlauf"
        case .bild: return "eigenes Bild …"
        }
    }
}

final class HintergrundAnsicht: NSView {
    var art: HintergrundArt = .papier { didSet { needsDisplay = true } }
    var bild: NSImage? { didSet { needsDisplay = true } }
    /// Weichzeichnen des eigenen Bildes — ein Foto im Hintergrund soll Fläche sein, nicht
    /// Konkurrenz zur Seite (Owner: „weich machen").
    var weich = true { didSet { needsDisplay = true } }

    override func draw(_ dirty: NSRect) {
        switch art {
        case .keiner:
            NSColor.clear.setFill(); bounds.fill()
        case .papier:
            PAPIER.setFill(); bounds.fill()
        case .dunkel:
            NSColor(calibratedRed: 0.09, green: 0.09, blue: 0.10, alpha: 1).setFill(); bounds.fill()
        case .verlauf:
            NSGradient(starting: NSColor(calibratedRed: 0.96, green: 0.94, blue: 0.89, alpha: 1),
                       ending: NSColor(calibratedRed: 0.82, green: 0.78, blue: 0.70, alpha: 1))?
                .draw(in: bounds, angle: 300)
        case .bild:
            guard let b = bild else { PAPIER.setFill(); bounds.fill(); return }
            /* Formatfüllend und beschnitten — ein verzerrtes Foto erkennt jeder sofort. */
            let f = max(bounds.width / b.size.width, bounds.height / b.size.height)
            let w = b.size.width * f, h = b.size.height * f
            let ziel = NSRect(x: (bounds.width - w) / 2, y: (bounds.height - h) / 2, width: w, height: h)
            if weich, let gefiltert = weichGezeichnet(b) {
                gefiltert.draw(in: ziel)
            } else {
                b.draw(in: ziel)
            }
            /* Ein Hauch Papier darüber nimmt dem Foto die Unruhe, ohne es zu verdecken. */
            if weich {
                PAPIER.withAlphaComponent(0.28).setFill()
                bounds.fill()
            }
        }
    }

    /// Einmal weichgezeichnet und gemerkt — bei jedem Neuzeichnen zu filtern kostet Bilder.
    private var gemerkt: (NSImage, NSImage)?
    private func weichGezeichnet(_ b: NSImage) -> NSImage? {
        if let (quelle, fertig) = gemerkt, quelle === b { return fertig }
        guard let daten = b.tiffRepresentation, let ein = CIImage(data: daten) else { return nil }
        guard let filter = CIFilter(name: "CIGaussianBlur") else { return nil }
        filter.setValue(ein.clampedToExtent(), forKey: kCIInputImageKey)
        filter.setValue(18.0, forKey: kCIInputRadiusKey)
        guard let aus = filter.outputImage?.cropped(to: ein.extent) else { return nil }
        let raus = NSImage(size: b.size)
        raus.addRepresentation(NSCIImageRep(ciImage: aus))
        gemerkt = (b, raus)
        return raus
    }
}

final class HintergrundFenster: NSPanel {
    let ansicht = HintergrundAnsicht()

    init() {
        super.init(contentRect: NSRect(x: 0, y: 0, width: 400, height: 700),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        /* Über dem Schreibtisch, UNTER den normalen Fenstern: Chrome muss darauf liegen können. */
        level = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopIconWindow)) + 1)
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        ignoresMouseEvents = true
        contentView = ansicht
    }

    override var canBecomeKey: Bool { false }

    func anRahmen(_ innen: NSRect) {
        setFrame(innen, display: true)
    }
}

// ══ DAS UNSCHÄRFE-FELD ════════════════════════════════════════════════════════════════════
// (Owner 18.09.2026, mit Bild des Trichters: „wie kann ich es machen, dass später die E-Mail
// nicht angezeigt wird, sondern blur?")
//
// Ein kleines Fenster, das man über die Stelle legt, die niemand lesen soll — Adresse, Passwort,
// Kundenname. `NSVisualEffectView` mit `blendingMode = .behindWindow` verwischt, was DAHINTER
// liegt, also der echte Inhalt der Seite: Die Aufnahme nimmt den verwischten Zustand auf. Kein
// Nachbearbeiten, kein Vergessen — und man sieht beim Sprechen, dass es wirkt.
//
// Es liegt bewusst IM Rahmen: Es SOLL im Film sein. Das unterscheidet es von allen anderen
// Griffen dieses Werkzeugs.
final class UnschaerfeAnsicht: NSVisualEffectView {
    private var letzteMaus = NSPoint.zero
    private var skaliert = false

    override var mouseDownCanMoveWindow: Bool { false }

    override func draw(_ dirty: NSRect) {
        super.draw(dirty)
        /* Ein dünner Rand und ein Griff in der Ecke — sonst weiss niemand, dass man das Feld
           anfassen kann. Beides hell und schwach: Es liegt im Bild. */
        NSColor.white.withAlphaComponent(0.35).setStroke()
        let p = NSBezierPath(rect: bounds.insetBy(dx: 0.5, dy: 0.5))
        p.lineWidth = 1
        p.stroke()
        NSColor.white.withAlphaComponent(0.5).setStroke()
        for i in 0..<3 {
            let v = CGFloat(i) * 4 + 3
            let g = NSBezierPath()
            g.move(to: NSPoint(x: bounds.maxX - v, y: bounds.minY + 2))
            g.line(to: NSPoint(x: bounds.maxX - 2, y: bounds.minY + v))
            g.lineWidth = 1
            g.stroke()
        }
    }

    override func mouseDown(with event: NSEvent) {
        letzteMaus = NSEvent.mouseLocation
        let p = convert(event.locationInWindow, from: nil)
        skaliert = p.x > bounds.maxX - 22 && p.y < bounds.minY + 22
    }

    override func mouseDragged(with event: NSEvent) {
        guard let w = window else { return }
        let maus = NSEvent.mouseLocation
        let dx = maus.x - letzteMaus.x, dy = maus.y - letzteMaus.y
        if skaliert {
            /* Nach rechts breiter, nach unten höher — der obere linke Punkt bleibt stehen. */
            let b = max(60, w.frame.width + dx)
            let h = max(28, w.frame.height - dy)
            w.setFrame(NSRect(x: w.frame.minX, y: w.frame.maxY - h, width: b, height: h), display: true)
        } else {
            w.setFrameOrigin(NSPoint(x: w.frame.origin.x + dx, y: w.frame.origin.y + dy))
        }
        letzteMaus = maus
    }
}

final class UnschaerfeFenster: NSPanel {
    init() {
        super.init(contentRect: NSRect(x: 0, y: 0, width: 320, height: 52),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        let a = UnschaerfeAnsicht()
        a.material = .hudWindow
        a.blendingMode = .behindWindow
        a.state = .active
        /* Stark verwischen: Bei schwacher Unschärfe kann man eine Adresse in einer Aufnahme mit
           genug Auflösung noch erraten. Zwei Ebenen übereinander wären teuer — stattdessen ein
           Material, das kräftig verwischt, plus ein Hauch Deckung. */
        a.appearance = NSAppearance(named: .darkAqua)
        contentView = a
    }

    override var canBecomeKey: Bool { false }

    /// Beim Einschalten in die Mitte des Rahmens legen — dort findet man es sofort.
    func inMitte(_ rahmen: NSRect) {
        setFrameOrigin(NSPoint(x: rahmen.midX - frame.width / 2, y: rahmen.midY - frame.height / 2))
    }
}

// ══ DIE DREI KNÖPFE AM KREIS ═══════════════════════════════════════════════════════════════
// (Owner 18.09.2026, nach zwei Fehlversuchen: „ich sehe die Icons nicht" · „ok, Icons gehen
// nicht")
//
// ── WARUM EIGENE FENSTER UND KEINE EBENEN IM KREIS ──────────────────────────────────────────
//
// Erst waren die Knöpfe in `draw` gezeichnet — unsichtbar, weil das Kamerabild eine Unterebene
// ist und Unterebenen über dem Gezeichneten liegen. Dann als eigene Ebenen über der Vorschau,
// ein- und ausgeblendet bei Mauskontakt — auch nichts, weil ein `nonactivatingPanel` Maus-
// Ereignisse nicht verlässlich bekommt, solange eine andere App vorn ist. Und beim Aufnehmen ist
// immer eine andere App vorn.
//
// Der rote Aufnahmeknopf funktioniert vom ersten Tag: weil er ein EIGENES Fenster ist. Genau das
// sind diese drei jetzt auch. Sie sind immer sichtbar, kleben außen am Kreis und wandern mit ihm
// — kein Ein- und Ausblenden, kein Ereignis, das verloren gehen kann.
//
// Sie liegen am äußeren Rand des Kreises, also im Film. Das ist der Preis dafür, dass man sie
// beim Sprechen treffen kann; wer sie nicht im Bild haben will, nimmt das Mausrad über dem Kreis.
/* Größe der kleinen Griffe an EINER Stelle (Owner 18.09.2026: „mach das Icon größer, es stört
   mich") — vorher stand die 34 in drei Dateistellen, und das Zeichen darin war zu klein für
   seine Scheibe. */
let MINI_D: CGFloat = 42

final class MiniKnopfAnsicht: NSView {
    var zeichen = "+"
    var gedrueckt: () -> Void = {}
    /// Gesetzt, wenn dieser Knopf ein GRIFF ist (verschieben/Größe) — dann zählt das Ziehen und
    /// nicht der Klick.
    var gezogenUm: ((CGFloat, CGFloat) -> Void)?
    private var drin = false
    private var letzteMaus = NSPoint.zero
    private var hatGezogen = false

    override func draw(_ dirty: NSRect) {
        let d = min(bounds.width, bounds.height)
        let scheibe = NSRect(x: 0, y: 0, width: d, height: d).insetBy(dx: 1, dy: 1)
        (drin ? NSColor.white : PAPIER).setFill()
        NSBezierPath(ovalIn: scheibe).fill()
        TINTE.withAlphaComponent(0.5).setStroke()
        let ring = NSBezierPath(ovalIn: scheibe.insetBy(dx: 0.75, dy: 0.75))
        ring.lineWidth = 1.5
        ring.stroke()
        let text = zeichen as NSString
        let stil: [NSAttributedString.Key: Any] = [
            /* Das Zeichen füllt die Scheibe jetzt deutlich — die Pfeile brauchen dabei mehr
               Punkte als „+", weil sie optisch kleiner wirken. */
            .font: NSFont.systemFont(ofSize: ["⤢", "⤡", "✥", "✕", "◱"].contains(zeichen) ? 22 : 28, weight: .semibold),
            .foregroundColor: TINTE,
        ]
        let masse = text.size(withAttributes: stil)
        text.draw(at: NSPoint(x: scheibe.midX - masse.width / 2, y: scheibe.midY - masse.height / 2),
                  withAttributes: stil)
    }

    override func mouseDown(with event: NSEvent) {
        letzteMaus = NSEvent.mouseLocation
        hatGezogen = false
    }

    override func mouseDragged(with event: NSEvent) {
        guard let zieh = gezogenUm else { return }
        hatGezogen = true
        let maus = NSEvent.mouseLocation
        zieh(maus.x - letzteMaus.x, maus.y - letzteMaus.y)
        letzteMaus = maus
    }

    override func mouseUp(with event: NSEvent) { if !hatGezogen { gedrueckt() } }
    override func mouseEntered(with event: NSEvent) { drin = true; needsDisplay = true }
    override func mouseExited(with event: NSEvent) { drin = false; needsDisplay = true }
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach { removeTrackingArea($0) }
        addTrackingArea(NSTrackingArea(rect: bounds, options: [.mouseEnteredAndExited, .activeAlways], owner: self))
    }
}

final class MiniKnopfFenster: NSPanel {
    let ansicht = MiniKnopfAnsicht(frame: NSRect(x: 0, y: 0, width: MINI_D, height: MINI_D))

    init(_ zeichen: String, tat: @escaping () -> Void) {
        super.init(contentRect: NSRect(x: 0, y: 0, width: MINI_D, height: MINI_D),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        /* Eine Stufe über dem Kreis, damit er sie nicht verdeckt. */
        level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue + 1)
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        ansicht.zeichen = zeichen
        ansicht.gedrueckt = tat
        contentView = ansicht
    }

    override var canBecomeKey: Bool { false }
}

// ══ DIE PLATZWAHL ═════════════════════════════════════════════════════════════════════════
// (Owner 18.09.2026: „so mag ich nicht. Ich will das ausklappen und wählen, genau wohin")
//
// Vorher schickte ein Knopf den Kreis durch die Plätze — man drückt viermal und landet doch
// nicht dort, wo man hin wollte. Hier klappt ein Feld mit neun Feldern auf: oben links bis
// unten rechts plus Mitte. Ein Blick, ein Klick, fertig; danach schliesst es sich von selbst.
final class PlatzWahlAnsicht: NSView {
    /// Spalte 0…2 (links→rechts), Zeile 0…2 (oben→unten).
    var gewaehlt: (Int, Int) -> Void = { _, _ in }
    var aktuell: (Int, Int)?
    private var drin: (Int, Int)?

    private let rand: CGFloat = 8

    private func feld(_ spalte: Int, _ zeile: Int) -> NSRect {
        let breite = (bounds.width - 2 * rand) / 3
        let hoehe = (bounds.height - 2 * rand) / 3
        /* Zeile 0 ist OBEN — auf dem Schirm wächst y nach oben, deshalb die Umkehrung. */
        return NSRect(x: rand + CGFloat(spalte) * breite,
                      y: bounds.maxY - rand - CGFloat(zeile + 1) * hoehe,
                      width: breite, height: hoehe).insetBy(dx: 3, dy: 3)
    }

    override func draw(_ dirty: NSRect) {
        PAPIER.setFill()
        NSBezierPath(roundedRect: bounds, xRadius: 12, yRadius: 12).fill()
        TINTE.withAlphaComponent(0.25).setStroke()
        let ring = NSBezierPath(roundedRect: bounds.insetBy(dx: 0.75, dy: 0.75), xRadius: 12, yRadius: 12)
        ring.lineWidth = 1.5
        ring.stroke()

        for zeile in 0..<3 {
            for spalte in 0..<3 {
                let r = feld(spalte, zeile)
                let ist = aktuell.map { $0 == (spalte, zeile) } ?? false
                let unterMaus = drin.map { $0 == (spalte, zeile) } ?? false
                if ist || unterMaus {
                    (ist ? TINTE : TINTE.withAlphaComponent(0.25)).setFill()
                    NSBezierPath(roundedRect: r, xRadius: 4, yRadius: 4).fill()
                } else {
                    TINTE.withAlphaComponent(0.35).setStroke()
                    let p = NSBezierPath(roundedRect: r, xRadius: 4, yRadius: 4)
                    p.lineWidth = 1
                    p.stroke()
                }
            }
        }
    }

    private func treffer(_ punkt: NSPoint) -> (Int, Int)? {
        for zeile in 0..<3 {
            for spalte in 0..<3 where feld(spalte, zeile).insetBy(dx: -3, dy: -3).contains(punkt) {
                return (spalte, zeile)
            }
        }
        return nil
    }

    override func mouseUp(with event: NSEvent) {
        guard let t = treffer(convert(event.locationInWindow, from: nil)) else { return }
        aktuell = t
        needsDisplay = true
        gewaehlt(t.0, t.1)
    }

    override func mouseMoved(with event: NSEvent) {
        drin = treffer(convert(event.locationInWindow, from: nil))
        needsDisplay = true
    }

    override func mouseExited(with event: NSEvent) { drin = nil; needsDisplay = true }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach { removeTrackingArea($0) }
        addTrackingArea(NSTrackingArea(rect: bounds,
                                       options: [.mouseEnteredAndExited, .mouseMoved, .activeAlways],
                                       owner: self))
    }
}

final class PlatzWahlFenster: NSPanel {
    let ansicht = PlatzWahlAnsicht(frame: NSRect(x: 0, y: 0, width: 120, height: 120))

    init() {
        super.init(contentRect: NSRect(x: 0, y: 0, width: 120, height: 120),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue + 2)
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        acceptsMouseMovedEvents = true
        contentView = ansicht
    }

    override var canBecomeKey: Bool { false }

    /// Klappt rechts neben dem Knopf auf, der sie geöffnet hat.
    func neben(_ knopf: NSRect) {
        setFrameOrigin(NSPoint(x: knopf.maxX + 6, y: knopf.midY - frame.height / 2))
    }
}

/// Die Griffe AUSSEN am Rahmen: verschieben, Größe, schliessen. Sie liegen außerhalb der
/// Aufnahmefläche, sind also nie im Film — und weil sie eigene Fenster sind, nimmt ihnen kein
/// durchlässiges Rahmenfenster die Klicks weg.
final class RahmenKnoepfe {
    let schieben: MiniKnopfFenster
    let groesse: MiniKnopfFenster
    let schliessen: MiniKnopfFenster

    init(rahmen: RahmenFenster) {
        schieben = MiniKnopfFenster("✥") {}
        groesse = MiniKnopfFenster("⤡") {}
        /* Schliessen gehört an die obere rechte Ecke — dort sucht es auf einem Mac jeder
           (Owner 18.09.2026: „Software beenden muss ich ein Icon haben am Rahmen rechts oben
           close"). */
        schliessen = MiniKnopfFenster("✕") { NSApp.terminate(nil) }

        schieben.ansicht.gezogenUm = { [rahmen] dx, dy in
            rahmen.setFrameOrigin(NSPoint(x: rahmen.frame.origin.x + dx, y: rahmen.frame.origin.y + dy))
        }
        groesse.ansicht.gezogenUm = { [rahmen] _, dy in
            /* Nach unten ziehen macht größer: Der obere Rand bleibt stehen, damit der Rahmen
               nicht unter der Hand wegläuft. */
            rahmen.aufHoehe(max(240, rahmen.frame.height - dy))
        }
    }

    func zeigen() { [schieben, groesse, schliessen].forEach { $0.orderFrontRegardless() } }

    func anRahmen(_ f: NSRect) {
        let d = MINI_D
        let luft: CGFloat = 4
        schieben.setFrameOrigin(NSPoint(x: f.minX - d - luft, y: f.maxY - d))
        schliessen.setFrameOrigin(NSPoint(x: f.maxX + luft, y: f.maxY - d))
        groesse.setFrameOrigin(NSPoint(x: f.maxX + luft, y: f.minY))
    }
}

/// Die drei zusammen — sie kennen nur den Kreis, an dem sie hängen.
final class KreisKnoepfe {
    let fenster: [MiniKnopfFenster]
    let platzWahl = PlatzWahlFenster()

    init(kreis: KreisFenster) {
        fenster = [
            MiniKnopfFenster("+") { kreis.groesseAendern(um: 40) },
            MiniKnopfFenster("–") { kreis.groesseAendern(um: -40) },
            /* Platz wählen — klappt das 3×3-Feld auf (Owner 18.09.2026). */
            MiniKnopfFenster("◱") {},
            MiniKnopfFenster("⤢") { kreis.vollUmschalten() },
        ]
    }

    func zeigen() { fenster.forEach { $0.orderFrontRegardless() } }

    /// Das Feld auf- und zuklappen. Nach der Wahl geht es von selbst zu — ein Feld, das
    /// offenbleibt, steht beim nächsten Griff im Weg.
    func platzWahlUmschalten(am knopf: NSRect) {
        if platzWahl.isVisible { platzWahl.orderOut(nil); return }
        platzWahl.neben(knopf)
        platzWahl.orderFrontRegardless()
    }

    func platzWahlZu() { platzWahl.orderOut(nil) }

    /* ── SIE STEHEN AUSSEN AM RAHMEN, AUF HÖHE DES KREISES ──────────────────────────────────
       (Owner 18.09.2026: „die Icons sind drin. Was soll das?")

       Erst klebten sie am Kreis selbst — und der Kreis liegt IM Rahmen, also waren sie im Film.
       Knöpfe in einer Anzeige gehen nicht, egal wie klein.

       Jetzt hängen sie draußen an der Rahmenkante, aber auf der HÖHE des Kreises: Die Hand geht
       weiterhin zum Kreis, der Blick bleibt im Rahmen, und aufgenommen wird nichts davon. Steht
       der Rahmen am linken Bildschirmrand, wechseln sie auf die andere Seite. */
    func anKreis(_ k: NSRect, rahmen: NSRect) {
        let d = MINI_D
        let luft: CGFloat = 4
        var x = rahmen.minX - d - luft
        if let schirm = NSScreen.screens.first(where: { $0.frame.intersects(rahmen) }) ?? NSScreen.main,
           x < schirm.frame.minX + 2 {
            x = rahmen.maxX + luft
        }
        /* ── SIE STEHEN FEST LINKS UNTEN (Owner 18.09.2026: „die Icons bleiben links unten") ──
           Vorher wanderte der Stapel mit der Höhe des Kreises — und damit auch die Knöpfe, die
           man beim Sprechen treffen soll. Eine Bedienung, die ihren Platz wechselt, muss man
           jedes Mal suchen; und sie lief dem ✥ des Rahmens in die Quere.
           Jetzt sitzt sie unverrückbar an der unteren linken Rahmenecke: Die Hand findet sie
           blind, egal wo der Kreis gerade steht. */
        let schritt = d + 6
        let hoehe = CGFloat(fenster.count - 1) * schritt
        let start = rahmen.minY + hoehe
        for (i, f) in fenster.enumerated() {
            f.setFrameOrigin(NSPoint(x: x, y: start - CGFloat(i) * schritt))
        }
    }
}

// ══ DER AUFNAHMEKNOPF AM RAHMEN ═══════════════════════════════════════════════════════════
// (Owner 18.09.2026: „Aufnahmeknopf als Icon muss auch im Rahmen sein. Der muss immer aktiv
// sein.")
//
// ── WARUM AN DER KANTE UND NICHT INNEN ──────────────────────────────────────────────────────
//
// Alles INNERHALB des Rahmens ist im Film — ein Knopf mitten im Bild wäre in jeder Anzeige zu
// sehen. Er klebt deshalb von außen an der Rahmenkante: mit dem Rahmen verbunden, immer unter
// der Hand, aber jenseits der Fläche, die zugeschnitten wird. Er wandert mit, wenn der Rahmen
// wandert.
//
// ── IMMER AKTIV ─────────────────────────────────────────────────────────────────────────────
//
// Er ist nie grau. Fehlt die Bildschirmerlaubnis, holt ein Druck genau diese Erlaubnis, statt
// nichts zu tun — ein Knopf, der sich nicht drücken lässt, erklärt nichts.
final class AufnahmeKnopfAnsicht: NSView {
    var laeuft = false { didSet { needsDisplay = true } }
    var gedrueckt: () -> Void = {}
    private var drin = false

    override func draw(_ dirty: NSRect) {
        let d = min(bounds.width, bounds.height)
        let aussen = NSRect(x: 0, y: 0, width: d, height: d)
        // Scheibe in Papierfarbe wie der Kamerakreis — ein Haus, eine Farbe.
        PAPIER.setFill()
        NSBezierPath(ovalIn: aussen).fill()
        TINTE.withAlphaComponent(drin ? 0.5 : 0.25).setStroke()
        let ring = NSBezierPath(ovalIn: aussen.insetBy(dx: 1.5, dy: 1.5))
        ring.lineWidth = 3
        ring.stroke()

        let rot = NSColor(calibratedRed: 0.70, green: 0.23, blue: 0.18, alpha: 1)
        rot.setFill()
        if laeuft {
            // Läuft: ein Viereck — das Zeichen für Stopp, in jeder App dasselbe.
            let k = d * 0.34
            NSBezierPath(roundedRect: NSRect(x: (d - k) / 2, y: (d - k) / 2, width: k, height: k),
                         xRadius: 3, yRadius: 3).fill()
        } else {
            let k = d * 0.46
            NSBezierPath(ovalIn: NSRect(x: (d - k) / 2, y: (d - k) / 2, width: k, height: k)).fill()
        }
    }

    override func mouseUp(with event: NSEvent) { gedrueckt() }
    override func mouseEntered(with event: NSEvent) { drin = true; needsDisplay = true }
    override func mouseExited(with event: NSEvent) { drin = false; needsDisplay = true }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach { removeTrackingArea($0) }
        addTrackingArea(NSTrackingArea(rect: bounds, options: [.mouseEnteredAndExited, .activeAlways], owner: self))
    }
}

final class KnopfFenster: NSPanel {
    let ansicht = AufnahmeKnopfAnsicht(frame: NSRect(x: 0, y: 0, width: 58, height: 58))

    init() {
        super.init(contentRect: NSRect(x: 0, y: 0, width: 58, height: 58),
                   styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        contentView = ansicht
    }

    override var canBecomeKey: Bool { false }

    /* Klebt von außen an der MITTE der rechten Rahmenkante — und bleibt auf dem Schirm, auch
       wenn der Rahmen am Bildschirmrand steht.

       Nicht mehr in der unteren Ecke (Owner 18.09.2026: „was ist das?" — dort lag der
       Größen-Griff ⤡ auf dem roten Knopf; zwei Griffe auf einem Punkt sind ein Griff zu viel).
       Die Mitte der Kante ist außerdem der kürzeste Weg der Hand, während man spricht. */
    func anRahmen(_ rahmen: NSRect) {
        let d = frame.width
        var x = rahmen.maxX + 10
        var y = rahmen.midY - d / 2
        if let schirm = NSScreen.screens.first(where: { $0.frame.intersects(rahmen) }) ?? NSScreen.main {
            if x + d > schirm.frame.maxX { x = rahmen.minX - d - 10 }          // dann links davon
            if x < schirm.frame.minX { x = rahmen.maxX - d - 10 }              // zur Not innen
            y = min(max(schirm.frame.minY + 8, y), schirm.frame.maxY - d - 8)
        }
        setFrameOrigin(NSPoint(x: x, y: y))
    }
}

// ══ DER ABSPIELER ══════════════════════════════════════════════════════════════════════════
// (Owner 18.09.2026: „ich will die letzten Filme dort abspielen oder löschen im Tool")
//
// Ein eigenes Fenster mit AVPlayerView — nicht QuickTime: Wer prüfen will, ob der Zuschnitt
// sitzt und der Kreis am richtigen Platz ist, soll dabei nicht die App wechseln und dafür
// womöglich die Aufnahmefenster verlieren.
final class FilmFenster: NSWindowController {
    private let spieler = AVPlayerView()

    init() {
        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 420, height: 720),
                         styleMask: [.titled, .closable, .resizable, .miniaturizable],
                         backing: .buffered, defer: false)
        w.title = "Film"
        super.init(window: w)
        /* UNTEN, NICHT ÜBER DEM BILD (Owner 18.09.2026: „die Videoleiste muss unten sein beim
           Abspielen"): `.floating` legt die Leiste als schwebenden Balken mitten übers Bild —
           genau dort, wo bei einem Hochformat-Film der Kreis und die Schrift liegen. `.inline`
           setzt sie unter das Bild. */
        spieler.controlsStyle = .inline
        spieler.videoGravity = .resizeAspect
        w.contentView = spieler
    }
    required init?(coder: NSCoder) { fatalError() }

    func spielen(_ datei: URL) {
        let p = AVPlayer(url: datei)
        spieler.player = p
        window?.title = datei.lastPathComponent
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        p.play()
    }

    func anhalten() { spieler.player?.pause(); spieler.player = nil }
}

// ══ DAS STEUERFENSTER ══════════════════════════════════════════════════════════════════════
final class Steuerung: NSWindowController {
    private let kreis: KreisFenster
    private let rahmen: RahmenFenster
    private let knopf: KnopfFenster
    private let hintergrund: HintergrundFenster
    private let unschaerfe = UnschaerfeFenster()
    private let aufnahme = Aufnahme()

    private let kameraWahl = NSPopUpButton()
    private let mikroWahl = NSPopUpButton()
    private let formatWahl = NSPopUpButton()
    private let startKnopf = NSButton(title: "Aufnahme starten", target: nil, action: nil)
    private let ordnerKnopf = NSButton(title: "Ordner öffnen", target: nil, action: nil)
    /* ── EIN AUSGANG, DER IMMER DA IST (Owner 18.09.2026: „beende das · ich kann es nicht
       beenden") ────────────────────────────────────────────────────────────────────────────────
       Die erste Fassung hatte kein Menü und damit kein ⌘Q, und die beiden schwebenden Fenster
       haben keinen Schliessknopf — die App liess sich nur über das Terminal abschiessen. Jetzt
       gibt es beides: das Menü (siehe `menueBauen`) und diesen Knopf. Hausregel: Der Ausgang
       gehört dorthin, wo der Start ist. */
    private let endeKnopf = NSButton(title: "Beenden", target: nil, action: nil)
    private let ordnerWahlKnopf = NSButton(title: "Ordner wählen …", target: nil, action: nil)
    private let erlaubnisKnopf = NSButton(title: "Bildschirmaufnahme erlauben", target: nil, action: nil)
    /* ── DIE LETZTEN FILME (Owner 18.09.2026) ────────────────────────────────────────────────
       Die Liste liest den Ausgabeordner, sie führt kein eigenes Verzeichnis: Was dort liegt, ist
       die Wahrheit — auch wenn du eine Datei im Finder umbenennst oder wegschiebst. */
    private let tabelle = NSTableView()
    private let abspielKnopf = NSButton(title: "Abspielen", target: nil, action: nil)
    private let zeigenKnopf = NSButton(title: "Im Finder", target: nil, action: nil)
    private let loeschKnopf = NSButton(title: "Löschen", target: nil, action: nil)
    private var filme: [URL] = []
    private let abspieler = FilmFenster()
    private let ordnerPfad = NSTextField(labelWithString: "")
    /* Größe und Platz des Kreises (Owner 18.09.2026: „ich kann auch die Position des Kreises und
       Größe bestimmen") — dasselbe, was Ziehen und Mausrad direkt am Kreis tun, nur genau. */
    private let kreisRegler = NSSlider(value: 220, minValue: 120, maxValue: 720, target: nil, action: nil)
    private let eckenWahl = NSSegmentedControl(labels: ["↙", "↘", "↖", "↗"], trackingMode: .momentary, target: nil, action: nil)
    private let vollKnopf = NSButton(title: "Voll / Kreis", target: nil, action: nil)
    private let spiegelHaken = NSButton(checkboxWithTitle: "Spiegeln", target: nil, action: nil)
    private let hgWahl = NSPopUpButton()
    private let blurHaken = NSButton(checkboxWithTitle: "Unschärfe-Feld (über E-Mail o. Ä. legen)", target: nil, action: nil)
    /* Der Ton-Versatz gegen das Nachhinken der Lippen (Owner 18.09.2026). 180 ms sind der
       Erfahrungswert der FaceTime-Kamera; der Regler bleibt, weil es an Kamera und Rechner
       hängt. Der Wert überlebt den Neustart — einmal eingestellt, immer richtig. */
    private let versatzRegler = NSSlider(value: 180, minValue: 0, maxValue: 500, target: nil, action: nil)
    private let versatzWert = NSTextField(labelWithString: "180 ms")
    private let nochmalKnopf = NSButton(title: "Letzte Aufnahme neu bauen", target: nil, action: nil)
    private static let versatzMerker = "tonVersatzMs"
    private let weichHaken = NSButton(checkboxWithTitle: "weich", target: nil, action: nil)
    private let stand = NSTextField(labelWithString: "bereit")

    private var videoGeraete: [Geraet] = []
    private var audioGeraete: [Geraet] = []
    private var kameras: [AVCaptureDevice] = []

    init(kreis: KreisFenster, rahmen: RahmenFenster, knopf: KnopfFenster, hintergrund: HintergrundFenster) {
        self.kreis = kreis
        self.rahmen = rahmen
        self.knopf = knopf
        self.hintergrund = hintergrund
        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 520, height: 640),
                         styleMask: [.titled, .closable, .miniaturizable],
                         backing: .buffered, defer: false)
        w.title = "Werbefilm Studio"
        super.init(window: w)
        aufbauen()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func zeile(_ titel: String, _ feld: NSView) -> NSView {
        let l = NSTextField(labelWithString: titel)
        l.font = .systemFont(ofSize: 12)
        l.textColor = .secondaryLabelColor
        let s = NSStackView(views: [l, feld])
        s.orientation = .vertical
        s.alignment = .leading
        s.spacing = 2
        feld.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return s
    }

    private func aufbauen() {
        let g = geraeteLesen()
        videoGeraete = g.video
        audioGeraete = g.audio
        /* `.external` kennt erst macOS 14 — auf 13 bleibt es bei der eingebauten Kamera, sonst
           baut die App auf älteren Systemen nicht. */
        var arten: [AVCaptureDevice.DeviceType] = [.builtInWideAngleCamera]
        if #available(macOS 14.0, *) { arten.append(.external) }
        kameras = AVCaptureDevice.DiscoverySession(
            deviceTypes: arten, mediaType: .video, position: .unspecified).devices

        kameraWahl.addItems(withTitles: kameras.isEmpty ? ["keine Kamera"] : kameras.map { $0.localizedName })
        kameraWahl.target = self
        kameraWahl.action = #selector(kameraGewechselt)

        let mikros = audioGeraete.filter { !istVirtuell($0) }
        mikroWahl.addItems(withTitles: (mikros.isEmpty ? audioGeraete : mikros).map { "[\($0.nr)] \($0.name)" })

        formatWahl.addItems(withTitles: FORMATE.map { $0.name })
        formatWahl.target = self
        formatWahl.action = #selector(formatGewechselt)

        startKnopf.target = self
        startKnopf.action = #selector(startOderStopp)
        startKnopf.bezelStyle = .rounded
        startKnopf.keyEquivalent = "\r"

        ordnerKnopf.target = self
        ordnerKnopf.action = #selector(ordnerOeffnen)
        ordnerKnopf.bezelStyle = .rounded

        endeKnopf.target = NSApp
        endeKnopf.action = #selector(NSApplication.terminate(_:))
        endeKnopf.bezelStyle = .rounded

        ordnerWahlKnopf.target = self
        ordnerWahlKnopf.action = #selector(ordnerWaehlen)
        ordnerWahlKnopf.bezelStyle = .rounded

        erlaubnisKnopf.target = self
        erlaubnisKnopf.action = #selector(erlaubnisHolen)
        erlaubnisKnopf.bezelStyle = .rounded

        let spalte = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("film"))
        spalte.title = "Letzte Filme"
        spalte.width = 400
        tabelle.addTableColumn(spalte)
        tabelle.dataSource = self
        tabelle.delegate = self
        tabelle.rowHeight = 20
        tabelle.headerView = nil
        tabelle.target = self
        tabelle.doubleAction = #selector(abspielen)
        tabelle.usesAlternatingRowBackgroundColors = true

        for (k, tat) in [(abspielKnopf, #selector(abspielen)), (zeigenKnopf, #selector(imFinderZeigen)), (loeschKnopf, #selector(loeschen))] {
            k.target = self
            k.action = tat
            k.bezelStyle = .rounded
            k.controlSize = .small
        }

        ordnerPfad.font = .systemFont(ofSize: 11)
        ordnerPfad.textColor = .secondaryLabelColor
        ordnerPfad.lineBreakMode = .byTruncatingMiddle

        kreisRegler.target = self
        kreisRegler.action = #selector(kreisGroesse)
        kreisRegler.isContinuous = true

        eckenWahl.target = self
        eckenWahl.action = #selector(kreisEcke)

        vollKnopf.target = self
        vollKnopf.action = #selector(vollUmschalten)
        vollKnopf.bezelStyle = .rounded

        spiegelHaken.target = self
        spiegelHaken.action = #selector(spiegelUmschalten)
        spiegelHaken.state = kreis.ansicht.gespiegelt ? .on : .off

        blurHaken.target = self
        blurHaken.action = #selector(blurUmschalten)

        let gemerkt = UserDefaults.standard.object(forKey: Steuerung.versatzMerker) as? Int
        versatzRegler.doubleValue = Double(gemerkt ?? 180)
        versatzRegler.target = self
        versatzRegler.action = #selector(versatzGeaendert)
        versatzRegler.isContinuous = true
        versatzWert.font = .monospacedDigitSystemFont(ofSize: 11, weight: .regular)
        versatzWert.textColor = .secondaryLabelColor

        nochmalKnopf.target = self
        nochmalKnopf.action = #selector(nochmalBauen)
        nochmalKnopf.bezelStyle = .rounded
        nochmalKnopf.controlSize = .small

        hgWahl.addItems(withTitles: HintergrundArt.allCases.map { $0.name })
        hgWahl.selectItem(at: HintergrundArt.papier.rawValue)
        hgWahl.target = self
        hgWahl.action = #selector(hintergrundGewechselt)

        weichHaken.target = self
        weichHaken.action = #selector(weichUmschalten)
        weichHaken.state = .on

        /* Der Kreis weiß von hier, wie groß „voll" ist, und meldet zurück, wenn du ihn am Bild
           selbst verschiebst — sonst zeigte der Regler eine Größe, die nicht mehr stimmt. */
        /* Der Knopf am Rahmen tut dasselbe wie der Knopf hier — EIN Weg, zwei Griffe. Immer
           aktiv: Fehlt die Erlaubnis, holt der Druck sie. */
        knopf.ansicht.gedrueckt = { [weak self] in
            guard let self else { return }
            if !bildschirmErlaubt() { self.erlaubnisHolen(); return }
            self.startOderStopp()
        }
        knopf.anRahmen(rahmen.frame)

        kreis.rahmenZiehen = { [rahmen] dx, dy in
            rahmen.setFrameOrigin(NSPoint(x: rahmen.frame.origin.x + dx, y: rahmen.frame.origin.y + dy))
        }

        kreis.vollFlaeche = { [rahmen] in rahmen.innenRect }
        /* Der Rahmen zieht den Kreis mit — verschieben, Größe ändern, Format wechseln. */
        rahmen.bewegt = { [kreis, knopf, hintergrund, rahmen] in
            kreis.nachRahmen()
            knopf.anRahmen(rahmen.frame)
            hintergrund.anRahmen(rahmen.innenRect)
            /* Der Kreis kann dabei stehenbleiben (gleicher Anker) — seine Knöpfe müssen dem
               Rahmen trotzdem folgen, sonst hängen sie plötzlich mitten im Bild. */
            kreis.knoepfeFolgen(kreis.frame)
        }
        kreis.geaendert = { [weak self] in self?.kreisStandZeigen() }

        stand.font = .systemFont(ofSize: 12)
        stand.textColor = .secondaryLabelColor

        let knoepfe = NSStackView(views: [startKnopf, endeKnopf, erlaubnisKnopf])
        knoepfe.orientation = .horizontal
        knoepfe.spacing = 8

        let kreisReihe = NSStackView(views: [kreisRegler, eckenWahl, vollKnopf, spiegelHaken])
        kreisReihe.orientation = .horizontal
        kreisReihe.spacing = 8

        let hgReihe = NSStackView(views: [hgWahl, weichHaken, blurHaken])
        hgReihe.orientation = .horizontal
        hgReihe.spacing = 8

        let versatzReihe = NSStackView(views: [versatzRegler, versatzWert, nochmalKnopf])
        versatzReihe.orientation = .horizontal
        versatzReihe.spacing = 8

        let ordnerReihe = NSStackView(views: [ordnerWahlKnopf, ordnerKnopf, ordnerPfad])
        ordnerReihe.orientation = .horizontal
        ordnerReihe.spacing = 8

        let rolle = NSScrollView()
        rolle.documentView = tabelle
        rolle.hasVerticalScroller = true
        rolle.borderType = .bezelBorder
        rolle.translatesAutoresizingMaskIntoConstraints = false
        rolle.heightAnchor.constraint(equalToConstant: 110).isActive = true
        rolle.widthAnchor.constraint(equalToConstant: 420).isActive = true

        let filmKnoepfe = NSStackView(views: [abspielKnopf, zeigenKnopf, loeschKnopf])
        filmKnoepfe.orientation = .horizontal
        filmKnoepfe.spacing = 8

        let filmBlock = NSStackView(views: [rolle, filmKnoepfe])
        filmBlock.orientation = .vertical
        filmBlock.alignment = .leading
        filmBlock.spacing = 6

        let stapel = NSStackView(views: [
            zeile("Kamera (Kreis)", kameraWahl),
            zeile("Mikrofon", mikroWahl),
            zeile("Format", formatWahl),
            zeile("Kreis: Größe · Ecke · voll — am Kreis selbst: + – ⤢ (nur bei Mauskontakt) oder Mausrad", kreisReihe),
            zeile("Hintergrund im Rahmen (Chrome liegt darauf)", hgReihe),
            zeile("Ton später legen (Lippen hinken nach)", versatzReihe),
            zeile("Filme speichern in", ordnerReihe),
            knoepfe,
            zeile("Letzte Filme (Doppelklick spielt)", filmBlock),
            stand,
        ])
        stapel.orientation = .vertical
        stapel.alignment = .leading
        stapel.spacing = 12
        stapel.edgeInsets = NSEdgeInsets(top: 18, left: 18, bottom: 18, right: 18)
        stapel.translatesAutoresizingMaskIntoConstraints = false
        window?.contentView = stapel
        NSLayoutConstraint.activate([
            kameraWahl.widthAnchor.constraint(equalToConstant: 360),
            mikroWahl.widthAnchor.constraint(equalToConstant: 360),
            formatWahl.widthAnchor.constraint(equalToConstant: 360),
            kreisRegler.widthAnchor.constraint(equalToConstant: 150),
            hgWahl.widthAnchor.constraint(equalToConstant: 250),
            versatzRegler.widthAnchor.constraint(equalToConstant: 160),
            ordnerPfad.widthAnchor.constraint(lessThanOrEqualToConstant: 200),
        ])

        kameraGewechselt()
        formatGewechselt()
        kreisStandZeigen()
        ordnerZeigen()
        versatzGeaendert()
        erlaubnisZeigen()
        filmeLaden()
        hintergrundGewechselt()
    }

    /// Liest den Ausgabeordner, neueste zuerst. Rohaufnahmen (`roh-…`) bleiben draußen — die
    /// interessieren niemanden, sie sind Zwischenschritt.
    func filmeLaden() {
        let fm = FileManager.default
        let alle = (try? fm.contentsOfDirectory(at: aufnahme.ausgabeOrdner,
                                                includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        filme = alle
            .filter { $0.pathExtension.lowercased() == "mp4" && !$0.lastPathComponent.hasPrefix("roh-") }
            .sorted { a, b in
                let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                return da > db
            }
        tabelle.reloadData()
        knoepfeStellen()
    }

    func knoepfeStellenOeffentlich() { knoepfeStellen() }

    private func knoepfeStellen() {
        let etwas = tabelle.selectedRow >= 0 && tabelle.selectedRow < filme.count
        abspielKnopf.isEnabled = etwas
        zeigenKnopf.isEnabled = etwas
        loeschKnopf.isEnabled = etwas
    }

    private var gewaehlt: URL? {
        let i = tabelle.selectedRow
        return (i >= 0 && i < filme.count) ? filme[i] : nil
    }

    @objc private func abspielen() {
        guard let datei = gewaehlt else { return }
        abspieler.spielen(datei)
    }

    @objc private func imFinderZeigen() {
        guard let datei = gewaehlt else { return }
        NSWorkspace.shared.activateFileViewerSelecting([datei])
    }

    /* IN DEN PAPIERKORB, NICHT WEG: Ein Film, den man nach zwanzig Minuten Aufnahme mit einem
       Klick endgültig verliert, ist der Grund, warum Werkzeuge Vertrauen verlieren. */
    @objc private func loeschen() {
        guard let datei = gewaehlt else { return }
        if abspieler.window?.title == datei.lastPathComponent { abspieler.anhalten() }
        NSWorkspace.shared.recycle([datei]) { [weak self] _, fehler in
            DispatchQueue.main.async {
                self?.stand.stringValue = fehler == nil
                    ? "\(datei.lastPathComponent) liegt im Papierkorb."
                    : "Löschen ging nicht: \(fehler?.localizedDescription ?? "")"
                self?.filmeLaden()
            }
        }
    }

    /// Der Knopf verschwindet, sobald die Erlaubnis da ist — ein Knopf, der nichts mehr tut,
    /// verwirrt beim nächsten Mal.
    func erlaubnisZeigen() {
        let ok = bildschirmErlaubt()
        erlaubnisKnopf.isHidden = ok
        startKnopf.isEnabled = ok
        /* Der Knopf am Rahmen bleibt drückbar — ohne Erlaubnis holt er sie (siehe oben). */
        if !ok {
            stand.stringValue = "Bildschirmaufnahme ist noch nicht erlaubt — auf den Knopf, dann erlauben und die App neu starten."
        }
    }

    @objc func erlaubnisHolen() {
        /* Fragt die App selbst — danach steht sie schaltbar in den Einstellungen. Das Ergebnis
           gilt erst nach einem Neustart: macOS gibt einem laufenden Prozess die Erlaubnis nicht
           nachträglich. */
        /* Erst die Anfrage der App selbst — nur wenn die verneint, ist die Liste nötig. */
        let sofort = bildschirmErlaubnisFragen()
        if sofort {
            stand.stringValue = "Erlaubt. Zur Sicherheit einmal neu starten (⌘Q, dann wieder öffnen)."
            erlaubnisZeigen()
            return
        }
        einstellungenOeffnen()
        let warnung = NSAlert()
        warnung.messageText = "Bildschirmaufnahme erlauben"
        warnung.informativeText = """
        In den Systemeinstellungen ist jetzt die Liste offen.

        1. Steht dort ein GRAUER Eintrag „Werbefilm Studio", markieren und mit „−" entfernen.
        2. Diese App mit „+" hinzufügen: \(Bundle.main.bundleURL.path)
        3. Schalter an, dann die App neu starten (⌘Q und wieder öffnen).
        """
        warnung.addButton(withTitle: "Verstanden")
        warnung.runModal()
    }

    private func ordnerZeigen() {
        ordnerPfad.stringValue = aufnahme.ausgabeOrdner.path
            .replacingOccurrences(of: FileManager.default.homeDirectoryForCurrentUser.path, with: "~")
    }

    @objc private func ordnerWaehlen() {
        let wahl = NSOpenPanel()
        wahl.canChooseDirectories = true
        wahl.canChooseFiles = false
        wahl.canCreateDirectories = true
        wahl.allowsMultipleSelection = false
        wahl.prompt = "Hierhin speichern"
        wahl.directoryURL = aufnahme.ausgabeOrdner
        guard wahl.runModal() == .OK, let ziel = wahl.url else { return }
        aufnahme.ordnerSetzen(ziel)
        ordnerZeigen()
        filmeLaden()
        stand.stringValue = "Filme gehen jetzt nach \(ziel.lastPathComponent)."
    }

    @objc private func kreisGroesse() { kreis.groesseSetzen(CGFloat(kreisRegler.doubleValue)) }
    @objc private func kreisEcke() { kreis.inEcke(eckenWahl.selectedSegment) }
    @objc private func vollUmschalten() { kreis.vollUmschalten() }

    @objc private func spiegelUmschalten() {
        kreis.ansicht.gespiegelt = spiegelHaken.state == .on
        if !aufnahme.laeuft {
            stand.stringValue = kreis.ansicht.gespiegelt
                ? "Spiegel an — so, wie du dich im Spiegel siehst (auch im Film)."
                : "Spiegel aus — Schrift, die du in die Kamera hältst, ist lesbar."
        }
    }

    private func kreisStandZeigen() {
        kreisRegler.isEnabled = !kreis.istVoll
        eckenWahl.isEnabled = !kreis.istVoll
        if !kreis.istVoll { kreisRegler.doubleValue = Double(kreis.frame.width) }
        vollKnopf.title = kreis.istVoll ? "zurück zum Kreis" : "Voll / Kreis"
        if !aufnahme.laeuft {
            stand.stringValue = kreis.istVoll
                ? "Du füllst das Bild — Doppelklick oder ⤢ macht wieder den Kreis."
                : "Kreis \(Int(kreis.frame.width)) pt · ziehen verschiebt den KREIS, ⌥ziehen den Rahmen · ◱ öffnet die Platzwahl · ⤢ voll"
        }
    }

    private var format: Format { FORMATE[max(0, formatWahl.indexOfSelectedItem)] }

    @objc private func kameraGewechselt() {
        guard !kameras.isEmpty else { stand.stringValue = "Keine Kamera gefunden."; return }
        kreis.kameraStarten(kameras[max(0, kameraWahl.indexOfSelectedItem)])
    }

    @objc private func formatGewechselt() {
        rahmen.aufFormat(format)
        kreis.nachRahmen()
        knopf.anRahmen(rahmen.frame)
        hintergrund.anRahmen(rahmen.innenRect)
    }

    @objc private func hintergrundGewechselt() {
        let art = HintergrundArt(rawValue: hgWahl.indexOfSelectedItem) ?? .papier
        if art == .bild {
            let wahl = NSOpenPanel()
            wahl.canChooseFiles = true
            wahl.canChooseDirectories = false
            wahl.allowedContentTypes = [.image]
            wahl.prompt = "Als Hintergrund nehmen"
            guard wahl.runModal() == .OK, let u = wahl.url, let b = NSImage(contentsOf: u) else {
                /* Abgebrochen: zurück auf das, was vorher stand — kein leerer Hintergrund. */
                hgWahl.selectItem(at: hintergrund.ansicht.art.rawValue)
                return
            }
            hintergrund.ansicht.bild = b
        }
        hintergrund.ansicht.art = art
        weichHaken.isEnabled = art == .bild
        hintergrund.setIsVisible(art != .keiner)
        stand.stringValue = art == .keiner
            ? "Kein Hintergrund — im Rahmen ist der Schreibtisch zu sehen."
            : "Hintergrund: \(art.name). Chrome darauf schieben."
    }

    private var versatzMs: Int { Int(versatzRegler.doubleValue.rounded()) }

    @objc private func versatzGeaendert() {
        versatzWert.stringValue = "\(versatzMs) ms"
        UserDefaults.standard.set(versatzMs, forKey: Steuerung.versatzMerker)
    }

    /* Nachjustieren ohne neu zu sprechen: Die Rohaufnahme liegt noch, nur der Ton wird anders
       gelegt. Zwei Läufe, und der Versatz sitzt. */
    @objc private func nochmalBauen() {
        stand.stringValue = "baue neu mit \(versatzMs) ms …"
        nochmalKnopf.isEnabled = false
        let rect = rahmen.innenRect
        let schirm = NSScreen.screens.first { $0.frame.intersects(rect) } ?? NSScreen.main!
        aufnahme.nochmalBauen(rect: rect, schirm: schirm, format: format, tonVersatzMs: versatzMs) { [weak self] (ergebnis: Result<URL, Panne>) in
            guard let self else { return }
            self.nochmalKnopf.isEnabled = true
            switch ergebnis {
            case .success(let datei):
                self.stand.stringValue = "neu gebaut: \(datei.lastPathComponent)"
                self.filmeLaden()
                self.abspieler.spielen(datei)
            case .failure(let panne):
                self.stand.stringValue = panne.text
            }
        }
    }

    @objc private func weichUmschalten() { hintergrund.ansicht.weich = weichHaken.state == .on }

    @objc private func blurUmschalten() {
        let an = blurHaken.state == .on
        if an {
            unschaerfe.inMitte(rahmen.innenRect)
            unschaerfe.orderFrontRegardless()
            stand.stringValue = "Unschärfe-Feld über die Stelle ziehen; Ecke unten rechts macht es größer."
        } else {
            unschaerfe.orderOut(nil)
            stand.stringValue = "Unschärfe-Feld aus."
        }
    }

    @objc private func ordnerOeffnen() { NSWorkspace.shared.open(aufnahme.ausgabeOrdner) }

    @objc func startOderStopp() {
        if aufnahme.laeuft { stoppen() } else { starten() }
    }

    private func starten() {
        guard let bildschirm = videoGeraete.first(where: istBildschirm) else {
            stand.stringValue = "Kein Bildschirmgerät gefunden. Fehlt die Erlaubnis für Bildschirmaufnahme?"
            return
        }
        let mikros = audioGeraete.filter { !istVirtuell($0) }
        let liste = mikros.isEmpty ? audioGeraete : mikros
        let mikroNr = liste.isEmpty ? 0 : liste[max(0, mikroWahl.indexOfSelectedItem)].nr

        /* Der gelbe Strich BLEIBT stehen: Er liegt außerhalb der Fläche, die zugeschnitten wird,
           also ist er nicht im Film — und du siehst während der ganzen Aufnahme, was im Bild
           ist (Owner 18.09.2026: „ich muss ihn immer sehen"). */
        rahmen.ansicht.beschriftung = "● Aufnahme"
        rahmen.ansicht.needsDisplay = true
        if let fehler = aufnahme.starten(bildschirmNr: bildschirm.nr, mikroNr: mikroNr) {
            stand.stringValue = fehler
            knopf.ansicht.laeuft = false
            return
        }
        startKnopf.title = "Stopp und bauen"
        knopf.ansicht.laeuft = true
        formatWahl.isEnabled = false
        stand.stringValue = "Aufnahme läuft — sprich, klick durch die Seite. Der Kreis ist mit im Bild."
        // Aus dem Weg: Das Steuerfenster soll nicht im Film stehen.
        window?.miniaturize(nil)
    }

    private func stoppen() {
        window?.deminiaturize(nil)
        stand.stringValue = "baue den Film …"
        knopf.ansicht.laeuft = false
        startKnopf.isEnabled = false
        let rect = rahmen.innenRect
        let schirm = NSScreen.screens.first { $0.frame.intersects(rect) } ?? NSScreen.main!
        aufnahme.stoppenUndBauen(rect: rect, schirm: schirm, format: format, tonVersatzMs: versatzMs) { [weak self] (ergebnis: Result<URL, Panne>) in
            guard let self else { return }
            self.startKnopf.isEnabled = true
            self.startKnopf.title = "Aufnahme starten"
            self.formatWahl.isEnabled = true
            self.formatGewechselt()
            switch ergebnis {
            case .success(let datei):
                self.stand.stringValue = "fertig: \(datei.lastPathComponent)"
                self.filmeLaden()
                /* Gleich ansehen: Ob Zuschnitt und Kreis sitzen, sieht man nur im Film. */
                self.abspieler.spielen(datei)
            case .failure(let panne):
                self.stand.stringValue = panne.text
            }
        }
    }
}

extension Steuerung: NSTableViewDataSource, NSTableViewDelegate {
    func numberOfRows(in tableView: NSTableView) -> Int { filme.count }

    func tableView(_ t: NSTableView, viewFor spalte: NSTableColumn?, row: Int) -> NSView? {
        let feld = NSTextField(labelWithString: beschriftung(row))
        feld.font = .systemFont(ofSize: 11)
        feld.lineBreakMode = .byTruncatingMiddle
        return feld
    }

    /// Name, Größe und Zeit in einer Zeile — mehr Spalten wären drei Klicks Sortieren für nichts.
    private func beschriftung(_ row: Int) -> String {
        guard row < filme.count else { return "" }
        let d = filme[row]
        let werte = try? d.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
        let mb = Double(werte?.fileSize ?? 0) / 1e6
        let form = DateFormatter()
        form.dateFormat = "dd.MM. HH:mm"
        let zeit = werte?.contentModificationDate.map { form.string(from: $0) } ?? ""
        return String(format: "%@  ·  %.1f MB  ·  %@", d.lastPathComponent, mb, zeit)
    }

    func tableViewSelectionDidChange(_ note: Notification) { knoepfeStellenOeffentlich() }
}

// ══ START ══════════════════════════════════════════════════════════════════════════════════
final class AppDelegate: NSObject, NSApplicationDelegate {
    var kreis: KreisFenster?
    var rahmen: RahmenFenster?
    var knopf: KnopfFenster?
    var hintergrund: HintergrundFenster?
    var kreisKnoepfe: KreisKnoepfe?
    var rahmenKnoepfe: RahmenKnoepfe?
    var steuerung: Steuerung?

    /* Ohne selbstgebaute Menüleiste hat eine mit `swiftc` gebaute App KEIN Menü — und damit kein
       ⌘Q, kein „Beenden", kein Ausblenden. Genau daran ist die App hängengeblieben. */
    private func menueBauen() {
        let leiste = NSMenu()
        let appEintrag = NSMenuItem()
        let appMenue = NSMenu()
        appMenue.addItem(withTitle: "Über Werbefilm Studio", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenue.addItem(.separator())
        appMenue.addItem(withTitle: "Ausblenden", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenue.addItem(withTitle: "Alle Fenster nach vorn", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        appMenue.addItem(.separator())
        appMenue.addItem(withTitle: "Werbefilm Studio beenden", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appEintrag.submenu = appMenue
        leiste.addItem(appEintrag)

        let fensterEintrag = NSMenuItem()
        let fensterMenue = NSMenu(title: "Fenster")
        fensterMenue.addItem(withTitle: "Steuerung zeigen", action: #selector(steuerungZeigen), keyEquivalent: "0")
        fensterMenue.items.last?.target = self
        fensterEintrag.submenu = fensterMenue
        leiste.addItem(fensterEintrag)

        NSApp.mainMenu = leiste
    }

    /* Die Steuerung fährt sich beim Aufnehmen ins Dock. Wer sie von dort nicht wiederfindet,
       holt sie hiermit zurück. */
    @objc private func steuerungZeigen() {
        steuerung?.window?.deminiaturize(nil)
        steuerung?.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationDidFinishLaunching(_ note: Notification) {
        menueBauen()
        let k = KreisFenster(groesse: 220)
        let r = RahmenFenster()
        let kn = KnopfFenster()
        let hg = HintergrundFenster()
        let kk = KreisKnoepfe(kreis: k)
        /* Der dritte Knopf (◱) klappt die Platzwahl neben sich auf; eine Wahl setzt den Kreis
           und schliesst wieder. */
        kk.fenster[2].ansicht.gedrueckt = { [weak kk] in
            guard let kk else { return }
            kk.platzWahlUmschalten(am: kk.fenster[2].frame)
        }
        kk.platzWahl.ansicht.gewaehlt = { [weak kk, weak k] spalte, zeile in
            k?.anPlatz(spalte: spalte, zeile: zeile)
            kk?.platzWahlZu()
        }
        let rk = RahmenKnoepfe(rahmen: r)
        k.knoepfeFolgen = { [weak kk, weak r] kreisFlaeche in
            guard let r else { return }
            kk?.anKreis(kreisFlaeche, rahmen: r.frame)
        }
        let s = Steuerung(kreis: k, rahmen: r, knopf: kn, hintergrund: hg)
        kreis = k; rahmen = r; knopf = kn; hintergrund = hg; steuerung = s
        kreisKnoepfe = kk; rahmenKnoepfe = rk
        r.griffeFolgen = { [weak rk] f in rk?.anRahmen(f) }

        // Der Kreis sitzt unten links IM Rahmen — dort, wo er auch im Film steht. Ab hier hält
        // ihn sein Anker dort, auch wenn der Rahmen wandert.
        k.nachRahmen()
        k.inEcke(0)
        kk.anKreis(k.frame, rahmen: r.frame)
        kk.zeigen()
        rk.anRahmen(r.frame)
        rk.zeigen()

        /* ── BEIM START WIRD NICHT GEFRAGT (Owner 18.09.2026: „wieso öffnet sich das immer?
           Systemeinstellungen?") ─────────────────────────────────────────────────────────────
           Hier stand eine Anfrage bei jedem Start. `CGRequestScreenCaptureAccess` springt aber
           in die Systemeinstellungen, wenn die Erlaubnis fehlt — und sie fehlte nach jedem
           Neubau, weil eine ohne Apple-Zertifikat signierte App für das System eine andere App
           ist. Ergebnis: Bei jedem Öffnen ging die Liste auf.
           Jetzt wird beim Start nur STUMM geprüft (`CGPreflight…`, kein Dialog, kein Sprung).
           Gefragt wird ausschliesslich, wenn der Benutzer den Knopf drückt. */
        hg.anRahmen(r.innenRect)
        hg.orderFrontRegardless()
        r.orderFrontRegardless()
        k.orderFrontRegardless()
        kn.anRahmen(r.frame)
        kn.orderFrontRegardless()
        s.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    /* Kommt er aus den Systemeinstellungen zurück, soll der Startknopf von selbst frei werden —
       nicht erst, wenn er irgendwo klickt. */
    func applicationDidBecomeActive(_ note: Notification) { steuerung?.erlaubnisZeigen() }
}

let app = NSApplication.shared
let delegat = AppDelegate()
app.delegate = delegat
app.setActivationPolicy(.regular)
app.run()
