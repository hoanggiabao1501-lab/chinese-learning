// =====================================================
// 1. BIẾN TOÀN CỤC
// =====================================================

let dictionaryEntries = [];

let hanziIndex = new Map();
let pinyinIndex = new Map();
let pinyinToneIndex = new Map();

let dictionaryLoaded = false;


// =====================================================
// 2. LẤY PHẦN TỬ HTML
// =====================================================

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const hanzi =
    document.getElementById("hanzi");

const pinyin =
    document.getElementById("pinyin");

const meaning =
    document.getElementById("meaning");

const speakButton =
    document.getElementById("speakButton");

const characterTarget =
    document.getElementById("characterTarget");

const searchResults =
    document.getElementById("searchResults");


// =====================================================
// 3. CHUẨN HÓA TEXT
// =====================================================

function normalizeText(text) {

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, "")
        .replace(/[-']/g, "")
        .trim();
}


// =====================================================
// 4. PINYIN CÓ DẤU
// =====================================================

function normalizeTonePinyin(text) {

    return text
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[-']/g, "")
        .trim();
}


function hasToneMark(text) {

    return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(text);
}


// =====================================================
// 5. KIỂM TRA CHỮ HÁN
// =====================================================

function isChineseCharacter(character) {

    return /[\u3400-\u9FFF]/.test(character);
}


function containsChinese(text) {

    return /[\u3400-\u9FFF]/.test(text);
}


// =====================================================
// 6. CHUYỂN PINYIN SỐ → PINYIN DẤU
//
// ni3 hao3 → nǐ hǎo
// =====================================================

function convertSyllableToToneMark(syllable) {

    const match =
        syllable.match(/^([A-Za-züÜvV:]+)([1-5])$/);


    if (!match) {
        return syllable;
    }


    let base = match[1];

    const tone =
        Number(match[2]);


    base = base
        .replace(/u:/g, "ü")
        .replace(/U:/g, "Ü")
        .replace(/v/g, "ü")
        .replace(/V/g, "Ü");


    if (tone === 5) {
        return base;
    }


    const toneMarks = {
        1: "\u0304",
        2: "\u0301",
        3: "\u030C",
        4: "\u0300"
    };


    const lower =
        base.toLowerCase();


    let vowelIndex = -1;


    if (lower.includes("a")) {

        vowelIndex =
            lower.indexOf("a");

    } else if (lower.includes("e")) {

        vowelIndex =
            lower.indexOf("e");

    } else if (lower.includes("ou")) {

        vowelIndex =
            lower.indexOf("o");

    } else {

        const vowels =
            "aeiouü";


        for (
            let i = base.length - 1;
            i >= 0;
            i--
        ) {

            if (
                vowels.includes(lower[i])
            ) {

                vowelIndex = i;

                break;
            }
        }
    }


    if (vowelIndex === -1) {
        return base;
    }


    const markedVowel =
        (
            base[vowelIndex]
            +
            toneMarks[tone]
        ).normalize("NFC");


    return (
        base.slice(0, vowelIndex)
        +
        markedVowel
        +
        base.slice(vowelIndex + 1)
    );
}


// =====================================================
// 7. CHUYỂN CẢ CỤM PINYIN
// =====================================================

function numberedPinyinToToneMarks(text) {

    return text
        .split(/\s+/)
        .map(function(part) {

            return convertSyllableToToneMark(part);

        })
        .join(" ");
}


// =====================================================
// 8. THÊM VÀO INDEX
// =====================================================

function addToIndex(
    index,
    key,
    entry
) {

    if (!key) {
        return;
    }


    if (!index.has(key)) {

        index.set(
            key,
            []
        );
    }


    index
        .get(key)
        .push(entry);
}


// =====================================================
// 9. ĐỌC FILE CVDICT
// =====================================================

function parseCVDICT(text) {

    const entries = [];

    const lines =
        text.split(/\r?\n/);


    const pattern =
        /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.*)\/$/;


    for (const rawLine of lines) {

        const line =
            rawLine.trim();


        if (
            line === ""
            ||
            line.startsWith("#")
        ) {
            continue;
        }


        const match =
            line.match(pattern);


        if (!match) {
            continue;
        }


        const traditional =
            match[1];

        const simplified =
            match[2];

        const pinyinNumbered =
            match[3];


        const meanings =
            match[4]
                .split("/")
                .map(
                    item =>
                        item.trim()
                )
                .filter(
                    item =>
                        item !== ""
                );


        const pinyinTone =
            numberedPinyinToToneMarks(
                pinyinNumbered
            );


        entries.push({

            traditional:
                traditional,

            simplified:
                simplified,

            pinyinNumbered:
                pinyinNumbered,

            pinyin:
                pinyinTone,

            meanings:
                meanings
        });
    }


    return entries;
}


// =====================================================
// 10. TẠO INDEX
// =====================================================

function buildIndexes() {

    hanziIndex.clear();

    pinyinIndex.clear();

    pinyinToneIndex.clear();


    for (
        const entry
        of dictionaryEntries
    ) {

        addToIndex(
            hanziIndex,
            entry.simplified,
            entry
        );


        addToIndex(
            hanziIndex,
            entry.traditional,
            entry
        );


        const plainPinyin =
            normalizeText(
                entry.pinyin
            );


        addToIndex(
            pinyinIndex,
            plainPinyin,
            entry
        );


        const tonePinyin =
            normalizeTonePinyin(
                entry.pinyin
            );


        addToIndex(
            pinyinToneIndex,
            tonePinyin,
            entry
        );


        entry.normalizedMeanings =
            entry.meanings.map(
                normalizeText
            );
    }
}


// =====================================================
// 11. TẢI TỪ ĐIỂN
// =====================================================

async function loadDictionary() {

    searchButton.disabled = true;

    searchInput.disabled = true;


    searchInput.placeholder =
        "Đang tải từ điển...";


    searchResults.innerHTML = `
        <div class="no-result">
            Đang tải từ điển Trung - Việt...
        </div>
    `;


    try {

        const response =
            await fetch(
                "data/CVDICT.u8"
            );


        if (!response.ok) {

            throw new Error(
                "Không tải được file CVDICT.u8"
            );
        }


        const text =
            await response.text();


        dictionaryEntries =
            parseCVDICT(text);


        buildIndexes();


        dictionaryLoaded = true;


        console.log(
            "Số mục từ:",
            dictionaryEntries.length
        );


        searchResults.innerHTML =
            "";


        searchButton.disabled =
            false;

        searchInput.disabled =
            false;


        searchInput.placeholder =
            "Nhập chữ Hán, Pinyin hoặc tiếng Việt...";


        const firstWord =
            hanziIndex.get("学习");


        if (
            firstWord
            &&
            firstWord.length > 0
        ) {

            displayWord(
                firstWord[0]
            );
        }

    } catch (error) {

        console.error(error);


        searchResults.innerHTML = `
            <div class="no-result">

                Không tải được từ điển.

                <br><br>

                Kiểm tra file:

                <strong>
                    data/CVDICT.u8
                </strong>

            </div>
        `;
    }
}


// =====================================================
// 12. XÓA KẾT QUẢ TRÙNG
// =====================================================

function removeDuplicateResults(results) {

    const seen =
        new Set();


    return results.filter(
        function(entry) {

            const key =
                entry.simplified
                +
                "|"
                +
                entry.pinyin
                +
                "|"
                +
                entry.meanings.join(",");


            if (
                seen.has(key)
            ) {
                return false;
            }


            seen.add(key);

            return true;
        }
    );
}


// =====================================================
// 13. TÌM TỪ
// =====================================================

function findWords(input) {

    const trimmedInput =
        input.trim();


    // -------------------------
    // A. CHỮ HÁN
    // -------------------------

    if (
        containsChinese(
            trimmedInput
        )
    ) {

        return (
            hanziIndex.get(
                trimmedInput
            )
            ||
            []
        );
    }


    // -------------------------
    // B. PINYIN CÓ DẤU
    // -------------------------

    if (
        hasToneMark(
            trimmedInput
        )
    ) {

        const key =
            normalizeTonePinyin(
                trimmedInput
            );


        const results =
            pinyinToneIndex.get(key);


        if (
            results
            &&
            results.length > 0
        ) {

            return removeDuplicateResults(
                results
            );
        }
    }


    // -------------------------
    // C. PINYIN KHÔNG DẤU
    // -------------------------

    const plainQuery =
        normalizeText(
            trimmedInput
        );


    const pinyinResults =
        pinyinIndex.get(
            plainQuery
        );


    if (
        pinyinResults
        &&
        pinyinResults.length > 0
    ) {

        return removeDuplicateResults(
            pinyinResults
        );
    }


    // -------------------------
    // D. TIẾNG VIỆT
    // -------------------------

    const exactResults = [];

    const partialResults = [];


    for (
        const entry
        of dictionaryEntries
    ) {

        let exactMatch = false;

        let partialMatch = false;


        for (
            const item
            of entry.normalizedMeanings
        ) {

            if (
                item === plainQuery
            ) {

                exactMatch = true;

                break;
            }


            if (
                item.includes(
                    plainQuery
                )
            ) {

                partialMatch = true;
            }
        }


        if (exactMatch) {

            exactResults.push(
                entry
            );

        } else if (partialMatch) {

            partialResults.push(
                entry
            );
        }
    }


    if (
        exactResults.length > 0
    ) {

        return removeDuplicateResults(
            exactResults
        );
    }


    return removeDuplicateResults(
        partialResults
    );
}


// =====================================================
// 14. HIỂN THỊ DANH SÁCH KẾT QUẢ
// =====================================================

function displaySearchResults(results) {

    searchResults.innerHTML =
        "";


    if (
        results.length === 0
    ) {

        searchResults.innerHTML = `
            <div class="no-result">
                Không tìm thấy từ phù hợp.
            </div>
        `;

        return;
    }


    if (
        results.length === 1
    ) {

        displayWord(
            results[0]
        );

        return;
    }


    const displayedResults =
        results.slice(
            0,
            50
        );


    displayedResults.forEach(
        function(entry) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "search-result-item";


            const meaningText =
                entry.meanings
                    .slice(0, 3)
                    .join("; ");


            item.innerHTML = `

                <div class="result-hanzi">
                    ${entry.simplified}
                </div>

                <div class="result-info">

                    <div class="result-pinyin">
                        ${entry.pinyin}
                    </div>

                    <div class="result-meaning">
                        ${meaningText}
                    </div>

                    ${
                        entry.traditional !==
                        entry.simplified

                        ?

                        `
                        <div
                            style="
                                font-size: 13px;
                                color: #888;
                                margin-top: 4px;
                            "
                        >
                            Phồn thể:
                            ${entry.traditional}
                        </div>
                        `

                        :

                        ""
                    }

                </div>
            `;


            item.addEventListener(
                "click",
                function() {

                    displayWord(
                        entry
                    );
                }
            );


            searchResults.appendChild(
                item
            );
        }
    );


    if (
        results.length > 50
    ) {

        const more =
            document.createElement(
                "div"
            );


        more.className =
            "no-result";


        more.innerText =
            `Có ${results.length} kết quả. Đang hiển thị 50 kết quả đầu tiên.`;


        searchResults.appendChild(
            more
        );
    }
}


// =====================================================
// 15. HIỂN THỊ MỘT TỪ
// =====================================================

function displayWord(entry) {

    hanzi.innerText =
        entry.simplified;


    pinyin.innerText =
        entry.pinyin;


    let meaningText =
        entry.meanings.join("; ");


    if (
        entry.traditional
        !==
        entry.simplified
    ) {

        meaningText +=
            "\n\nPhồn thể: "
            +
            entry.traditional;
    }


    meaning.innerText =
        meaningText;


    renderCharacters(
        entry.simplified
    );


    searchResults.innerHTML =
        "";
}


// =====================================================
// 16. TRA TỪ
// =====================================================

function searchWord() {

    if (!dictionaryLoaded) {

        alert(
            "Từ điển vẫn đang tải."
        );

        return;
    }


    const input =
        searchInput.value.trim();


    if (
        input === ""
    ) {

        alert(
            "Hãy nhập chữ Hán, Pinyin hoặc tiếng Việt."
        );

        return;
    }


    const results =
        findWords(input);


    displaySearchResults(
        results
    );
}


// =====================================================
// 17. HIỂN THỊ CHỮ HÁN
// =====================================================

function renderCharacters(word) {

    characterTarget.innerHTML =
        "";


    const characters =
        [...word].filter(
            isChineseCharacter
        );


    characters.forEach(
        function(
            character,
            index
        ) {

            createCharacterCard(
                character,
                index
            );
        }
    );
}


// =====================================================
// 18. TẠO HANZI WRITER
// =====================================================

function createCharacterCard(
    character,
    index
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "character-card";


    const writerID =
        "writer-" + index;


    const counterID =
        "counter-" + index;


    card.innerHTML = `

        <div class="character-title">
            ${character}
        </div>

        <div
            id="${writerID}"
            class="writer-box">
        </div>

        <div
            id="${counterID}"
            class="stroke-counter"
        >
            Đang tải dữ liệu nét...
        </div>

        <div class="writer-buttons">

            <button class="animate-all">
                ▶ Xem toàn bộ
            </button>

            <button class="next-stroke">
                → Nét tiếp theo
            </button>

            <button class="restart-stroke">
                ↻ Bắt đầu lại
            </button>

        </div>
    `;


    characterTarget.appendChild(
        card
    );


   const writer =
    HanziWriter.create(
        writerID,
        character,
        {
            width: 320,
            height: 320,

            padding: 20,

            // Không hiện nét xám phía sau
            showOutline: false,

            // Ban đầu không hiện sẵn chữ hoàn chỉnh
            showCharacter: false,

            // Tốc độ viết
            strokeAnimationSpeed: 0.8,

            // Khoảng nghỉ giữa các nét
            delayBetweenStrokes: 800,

            // Nét đã viết giữ nguyên, không mờ đi
            strokeFadeDuration: 0
        }
    );


    let currentStroke = 0;

    let totalStrokes = 0;


    HanziWriter
        .loadCharacterData(
            character
        )

        .then(
            function(characterData) {

                totalStrokes =
                    characterData
                        .strokes
                        .length;


                updateCounter();
            }
        );


    function updateCounter() {

        const counter =
            document.getElementById(
                counterID
            );


        counter.innerText =
            `Nét ${currentStroke} / ${totalStrokes}`;
    }


    card
        .querySelector(
            ".animate-all"
        )
        .addEventListener(
            "click",
            function() {

                currentStroke = 0;

                writer
                    .animateCharacter({

                        onComplete:
                            function() {

                                currentStroke =
                                    totalStrokes;

                                updateCounter();
                            }
                    });
            }
        );


    card
        .querySelector(
            ".next-stroke"
        )
        .addEventListener(
            "click",
            function() {

                if (
                    currentStroke >=
                    totalStrokes
                ) {

                    currentStroke = 0;
                }


                writer.animateStroke(
                    currentStroke
                );


                currentStroke++;

                updateCounter();
            }
        );


    card
        .querySelector(
            ".restart-stroke"
        )
        .addEventListener(
            "click",
            function() {

                currentStroke = 0;


                writer.hideCharacter({

                    duration: 0

                });


                updateCounter();
            }
        );
}


// =====================================================
// 19. NÚT TRA
// =====================================================

searchButton.addEventListener(
    "click",
    searchWord
);
// =====================================================
// GỢI Ý TÌM KIẾM
// =====================================================

function showSuggestions(input) {

    if (!dictionaryLoaded) {
        return;
    }


    const results = [];

    const query =
        normalizeText(input);


    if (
        query.length === 0
    ) {
        return;
    }


    // =================================================
    // 1. Nếu đang nhập chữ Hán
    // =================================================

    if (
        containsChinese(input)
    ) {

        for (
            const entry
            of dictionaryEntries
        ) {

            if (
                entry.simplified
                    .startsWith(input)

                ||

                entry.traditional
                    .startsWith(input)
            ) {

                results.push(
                    entry
                );

            }


            // Chỉ lấy tối đa 12 gợi ý
            if (
                results.length >= 12
            ) {

                break;

            }

        }

    }


    // =================================================
    // 2. Nếu nhập Pinyin hoặc tiếng Việt
    // =================================================

    else {

        for (
            const entry
            of dictionaryEntries
        ) {

            // -------------------------
            // PINYIN
            // -------------------------

            const entryPinyin =
                normalizeText(
                    entry.pinyin
                );


            if (
                entryPinyin
                    .startsWith(query)
            ) {

                results.push(
                    entry
                );

            }

            else {

                // -------------------------
                // TIẾNG VIỆT
                // -------------------------

                for (
                    const meaningItem
                    of entry.normalizedMeanings
                ) {

                    if (
                        meaningItem
                            .startsWith(query)
                    ) {

                        results.push(
                            entry
                        );

                        break;

                    }

                }

            }


            if (
                results.length >= 12
            ) {

                break;

            }

        }

    }


    const cleanedResults =
        removeDuplicateResults(
            results
        );


    displaySuggestions(
        cleanedResults
    );

}
// =====================================================
// HIỂN THỊ GỢI Ý
// =====================================================

function displaySuggestions(results) {

    searchResults.innerHTML =
        "";


    // Không hiện thông báo nếu chưa có gợi ý
    if (
        results.length === 0
    ) {

        return;

    }


    results.forEach(
        function(entry) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "search-result-item";


            const shortMeaning =
                entry.meanings
                    .slice(0, 2)
                    .join("; ");


            item.innerHTML = `

                <div class="result-hanzi">

                    ${entry.simplified}

                </div>


                <div class="result-info">

                    <div class="result-pinyin">

                        ${entry.pinyin}

                    </div>


                    <div class="result-meaning">

                        ${shortMeaning}

                    </div>

                </div>

            `;


            item.addEventListener(
                "click",
                function() {

                    // Điền chữ đã chọn vào ô tìm kiếm
                    searchInput.value =
                        entry.simplified;


                    // Hiển thị từ
                    displayWord(
                        entry
                    );

                }
            );


            searchResults
                .appendChild(
                    item
                );

        }
    );

}


// =====================================================
// 20. ENTER ĐỂ TRA
// =====================================================

searchInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Enter"
        ) {

            searchWord();
        }
    }
);
// =====================================================
// GỢI Ý KHI ĐANG GÕ
// =====================================================

let typingTimer;


searchInput.addEventListener(
    "input",
    function() {

        // Xóa bộ đếm cũ
        clearTimeout(
            typingTimer
        );


        const input =
            searchInput.value.trim();


        // Nếu ô trống
        if (
            input === ""
        ) {

            searchResults.innerHTML =
                "";

            return;
        }


        // Chờ người dùng ngừng gõ 300ms
        typingTimer =
            setTimeout(
                function() {

                    showSuggestions(
                        input
                    );

                },
                300
            );

    }
);


// =====================================================
// 21. PHÁT ÂM
// =====================================================

speakButton.addEventListener(
    "click",
    function() {

        const text =
            hanzi.innerText.trim();


        const speech =
            new SpeechSynthesisUtterance(
                text
            );


        speech.lang =
            "zh-CN";


        speech.rate =
            0.8;


        window
            .speechSynthesis
            .cancel();


        window
            .speechSynthesis
            .speak(
                speech
            );
    }
);


// =====================================================
// 22. KHỞI ĐỘNG
// =====================================================

loadDictionary();