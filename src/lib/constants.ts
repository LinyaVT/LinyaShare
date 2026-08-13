import path from 'path';

/**
 * Resolve path correctly:
 * - If path is absolute (starts with /), use it directly.
 * - If path is relative, append it to the working directory.
 */
const resolvePath = (envPath: string | undefined, fallback: string) => {
  if (!envPath) return path.join(process.cwd(), fallback);
  return envPath.startsWith('/') ? envPath : path.join(process.cwd(), envPath);
};

export const UPLOAD_DIR = resolvePath(process.env.UPLOAD_DIR, 'data/uploads');
export const IMPORT_DIR = resolvePath(process.env.IMPORT_DIR, 'data/import');
export const GLOBAL_UPLOAD_DIR = resolvePath(process.env.GLOBAL_UPLOAD_DIR, 'data/uploads/global');
export const BACKGROUND_DIR = path.join(GLOBAL_UPLOAD_DIR, 'background');
export const FONTS_DIR = path.join(GLOBAL_UPLOAD_DIR, 'fonts');
export const CUSTOM_FONTS_DIR = path.join(FONTS_DIR, 'custom');

export const CHUNK_SIZE = 512 * 1024; // 512KB – stays below nginx default (1m) so no proxy config is needed
export const DEFAULT_STORAGE_LIMIT = 524288000; // 500MB in bytes
export const MAX_EMBED_SIZE = 50 * 1024 * 1024; // 50MB – größere Media-Dateien bekommen keinen Embed-Link

// Video Extensions
export const VIDEO_EXTENSIONS = /\.(mp4|webm|avi|mov|mkv|wmv|flv|m4v|mpg|mpeg|3gp|3g2|m2ts|mts|vob|divx|rm|rmvb|ogv|ogm|f4v|f4p)$/i;

// Audio Extensions  
export const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|aac|m4a|m4b|m4p|wma|opus|aif|aiff|au|mid|midi|amr|ra|weba|ape|wv|mp2|mod|s3m|it|xm)$/i;

// Image Extensions
export const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic|heif|tif|tiff|tga|targa|exr|hdr|dds|jfif|jpe|pnm|pbm|pgm|ppm|wbmp|pict|apng)$/i;

// Archive Extensions
export const ARCHIVE_EXTENSIONS = /\.(zip|rar|tar|gz|tgz|tbz|tbz2|txz|7z|bz2|xz|cab|arj|lha|lzh|zst|zstd|lz|lz4|br|sit|sitx|zipx|egg|z)$/i;

// Code / Script Extensions
export const CODE_EXTENSIONS = /\.(py|pyw|ipynb|js|mjs|cjs|jsx|ts|tsx|java|c|h|cpp|cxx|hpp|cc|cs|go|rs|rb|php|kt|kts|swift|sh|bash|zsh|sql|r|lua|pl|pm|dart|scala|html|css|svelte|vue|m|mm|vb|f|f77|f90|f95|for|asm|s|hs|ml|clj|cljs|erl|ex|exs|nim|sol|proto|graphql|gql|tf|gradle|tcl|awk|ino|v|sv|jl|zig|groovy|ps1|psd1|psm1|fs|fsx|pas|pp|ahk)$/i;

// Executable / Program Extensions (inkl. Disk-Images & VMs)
export const EXECUTABLE_EXTENSIONS = /\.(jar|war|ear|exe|msi|msix|apk|ipa|appx|deb|rpm|dmg|pkg|run|bat|cmd|bin|com|iso|img|vhd|vmdk|vhdx|qcow2|ova|ovf|dll|sys|drv|lib|so|unitypackage|scr|cpl)$/i;

// 3D Model Extensions
export const MODEL_EXTENSIONS = /\.(stl|obj|fbx|step|stp|iges|igs|dwg|dxf|blend|glb|gltf|3ds|dae|ply|3mf|amf|c4d|max|ma|mb|skp|sldprt|sldasm|sat|x_t|x_b|ifc|ipt|iam|rvt|usdz)$/i;

// Data / Config Extensions (inkl. Geo- & Metadaten)
export const DATA_EXTENSIONS = /\.(json|jsonl|ndjson|xml|yaml|yml|toml|ini|cfg|conf|properties|opml|ics|ical|vcf|vcard|plist|reg|har|torrent|geojson|kml|gpx)$/i;

// Database Extensions
export const DATABASE_EXTENSIONS = /\.(db|sqlite|sqlite3|db3|mdb|accdb|dbf|parquet|fmp12|fp7|kdb|kdbx)$/i;

// Font Extensions
export const FONT_EXTENSIONS = /\.(ttf|otf|woff|woff2|eot|ttc|otc|fon|dfont)$/i;

// Document Extensions (Text & Word, Emails, Web-Archive, Publisher)
export const DOCUMENT_EXTENSIONS = /\.(txt|text|md|markdown|mdown|rmd|rtf|rtfd|doc|docx|docm|dot|dotx|dotm|odt|pages|tex|log|nfo|wpd|wps|abw|rst|org|adoc|asciidoc|fountain|pub|eml|msg|mht|mhtml)$/i;

// PDF Extensions
export const PDF_EXTENSIONS = /\.(pdf|xps|oxps)$/i;

// Spreadsheet Extensions
export const SPREADSHEET_EXTENSIONS = /\.(xls|xlsx|xlsm|xlsb|xlt|xltx|xltm|ods|ots|csv|tsv|numbers|sxc|gnumeric|et)$/i;

// Presentation Extensions
export const PRESENTATION_EXTENSIONS = /\.(ppt|pptx|pptm|pps|ppsx|pot|potx|potm|odp|otp|keynote|sxi|fodp|dps)$/i;

// E-Book / Comic Extensions
export const EBOOK_EXTENSIONS = /\.(epub|mobi|azw|azw1|azw3|azw4|kfx|kf8|djvu|fb2|lit|prc|ibooks|cbz|cbr|cb7|cba)$/i;

// Subtitle Extensions
export const SUBTITLE_EXTENSIONS = /\.(srt|vtt|ass|ssa|sub|sbv|ttml|dfxp|mpl2|idx)$/i;

// Design Extensions
export const DESIGN_EXTENSIONS = /\.(psd|psb|psdt|ai|ps|eps|fig|sketch|xd|indd|cdr|xcf|afdesign|afphoto|pdn|kra|clip|sai)$/i;

// Key / Certificate Extensions
export const KEY_EXTENSIONS = /\.(pem|crt|key|pfx|p12|jks|cer|der|csr|p7b|p7c|spc|keystore|gpg)$/i;