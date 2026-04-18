// TUGAS KECIL 1 IF2211 STRATEGI ALGORITMA
// NAMA : Yasmin Farisah Salma
// NIM  : 13522140

#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <map>
#include <fstream>
#include <random>
#include <chrono>
#include <set>
#include <limits>
#include <climits>
#include <cctype>
using namespace std;

// ---------- GLOBAL STATE
int n, m, u, numOfSequences;      // n = rows, m = buffer size, u = cols
int maxReward = INT_MIN;
vector<int> maxRewardPath;
vector<vector<string>> matrix;
map<string, int> sequenceRewards;

// ---------- HELPERS
static bool isValidToken(const string &t)
{
    if (t.size() != 2)
        return false;
    for (char c : t)
    {
        if (!isalnum(static_cast<unsigned char>(c)))
            return false;
        if (isalpha(static_cast<unsigned char>(c)) && !isupper(static_cast<unsigned char>(c)))
            return false;
    }
    return true;
}

static bool isValidSequence(const string &line, vector<string> &out)
{
    istringstream iss(line);
    string tok;
    out.clear();
    while (iss >> tok)
    {
        if (!isValidToken(tok))
            return false;
        out.push_back(tok);
    }
    return !out.empty();
}

static int readPositiveInt(const string &prompt, int minVal = 1)
{
    int v;
    while (true)
    {
        cout << prompt;
        if (cin >> v && v >= minVal)
        {
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            return v;
        }
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        cout << "!! Invalid. Must be an integer >= " << minVal << ".\n";
    }
}

// ---------- INPUT MODES
void manualInput()
{
    cout << "\n=== MANUAL INPUT ===\n";
    m = readPositiveInt(">> Buffer size: ");

    cout << ">> Matrix dimension (width height): ";
    while (!(cin >> u >> n) || u < 1 || n < 1)
    {
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        cout << "!! Invalid. Enter two positive integers, e.g. 6 6: ";
    }
    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    matrix.assign(n, vector<string>(u));
    cout << ">> Matrix elements (" << n << " rows x " << u << " tokens):\n";
    for (int i = 0; i < n; ++i)
    {
        for (int j = 0; j < u; ++j)
        {
            while (true)
            {
                if (!(cin >> matrix[i][j]))
                {
                    cin.clear();
                    cin.ignore(numeric_limits<streamsize>::max(), '\n');
                    cout << "!! Read error. Re-enter: ";
                    continue;
                }
                if (!isValidToken(matrix[i][j]))
                {
                    cout << "!! Token must be 2 uppercase-alphanumeric chars. Re-enter: ";
                    continue;
                }
                break;
            }
        }
    }
    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    numOfSequences = readPositiveInt(">> Number of sequences: ");

    set<string> seen;
    for (int i = 1; i <= numOfSequences; ++i)
    {
        string line;
        vector<string> toks;
        while (true)
        {
            cout << ">> Sequence " << i << " (tokens separated by space): ";
            getline(cin, line);
            if (!isValidSequence(line, toks))
            {
                cout << "!! Invalid tokens. Try again.\n";
                continue;
            }
            if (toks.size() < 2)
            {
                cout << "!! Sequence must have at least 2 tokens.\n";
                continue;
            }
            string canon;
            for (size_t k = 0; k < toks.size(); ++k)
            {
                if (k) canon += ' ';
                canon += toks[k];
            }
            if (seen.count(canon))
            {
                cout << "!! Duplicate sequence. Try again.\n";
                continue;
            }
            line = canon;
            seen.insert(canon);
            break;
        }
        int reward = readPositiveInt(">> Reward for sequence " + to_string(i) + ": ");
        sequenceRewards[line] = reward;
    }
}

void randomizedInput()
{
    cout << "\n=== RANDOMIZED INPUT ===\n";
    int numTokens = readPositiveInt(">> Number of unique tokens: ");

    vector<string> tokens;
    tokens.reserve(numTokens);
    set<string> tokenSet;
    cout << ">> Enter " << numTokens << " unique tokens (e.g. BD 1C 55 ...):\n>> ";
    for (int i = 0; i < numTokens; ++i)
    {
        string t;
        while (true)
        {
            if (!(cin >> t))
            {
                cin.clear();
                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout << "!! Read error. Re-enter token " << (i + 1) << ": ";
                continue;
            }
            if (!isValidToken(t))
            {
                cout << "!! Invalid token. Re-enter: ";
                continue;
            }
            if (tokenSet.count(t))
            {
                cout << "!! Duplicate. Re-enter: ";
                continue;
            }
            tokens.push_back(t);
            tokenSet.insert(t);
            break;
        }
    }
    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    m = readPositiveInt(">> Buffer size: ");

    cout << ">> Matrix dimension (width height): ";
    while (!(cin >> u >> n) || u < 1 || n < 1)
    {
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        cout << "!! Invalid. Enter two positive integers: ";
    }
    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    int jumlah_sekuens = readPositiveInt(">> Number of sequences: ");
    int max_seq_len = readPositiveInt(">> Maximum tokens per sequence (>=2): ", 2);

    random_device rd;
    mt19937 gen(rd());

    matrix.assign(n, vector<string>(u));
    for (int i = 0; i < n; ++i)
        for (int j = 0; j < u; ++j)
            matrix[i][j] = tokens[gen() % numTokens];

    set<string> uniqueSequences;
    sequenceRewards.clear();
    for (int i = 0; i < jumlah_sekuens; ++i)
    {
        string seqStr;
        while (true)
        {
            stringstream ss;
            int len = (max_seq_len == 2) ? 2 : (gen() % (max_seq_len - 1) + 2);
            for (int j = 0; j < len; ++j)
            {
                if (j) ss << ' ';
                ss << tokens[gen() % numTokens];
            }
            seqStr = ss.str();
            if (!uniqueSequences.count(seqStr))
            {
                uniqueSequences.insert(seqStr);
                sequenceRewards[seqStr] = gen() % 100 + 1;
                break;
            }
        }
    }

    cout << "\n--- Generated input ---\n";
    cout << m << "\n" << u << " " << n << "\n";
    for (const auto &row : matrix)
    {
        for (const auto &e : row) cout << e << " ";
        cout << "\n";
    }
    cout << sequenceRewards.size() << "\n";
    for (const auto &s : sequenceRewards)
        cout << s.first << "\n" << s.second << "\n";
    cout << "-----------------------\n";
}

void fileInput()
{
    cout << "\n=== FILE INPUT ===\n";
    ifstream inputFile;
    string filename, filePath;

    while (true)
    {
        cout << ">> Filename in inputs/ (without .txt extension): ";
        if (!(cin >> filename))
        {
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            continue;
        }
        filePath = "../inputs/" + filename + ".txt";
        inputFile.open(filePath);
        if (inputFile.is_open()) break;
        cout << "!! File not found: " << filePath << ". Try again.\n";
    }
    cin.ignore(numeric_limits<streamsize>::max(), '\n');

    inputFile >> m;
    inputFile >> n >> u;
    matrix.assign(n, vector<string>(u));
    for (int i = 0; i < n; ++i)
        for (int j = 0; j < u; ++j)
            inputFile >> matrix[i][j];

    inputFile >> numOfSequences;
    inputFile.ignore();
    for (int i = 0; i < numOfSequences; ++i)
    {
        string sequence;
        int reward;
        getline(inputFile, sequence);
        inputFile >> reward;
        inputFile.ignore();
        sequenceRewards[sequence] = reward;
    }
    inputFile.close();
}

// ---------- SOLVER
int calculateReward(const vector<int> &path)
{
    string pathStr;
    for (int idx : path)
    {
        if (!pathStr.empty()) pathStr += ' ';
        pathStr += matrix[idx / u][idx % u];
    }
    int total = 0;
    for (const auto &sr : sequenceRewards)
        if (pathStr.find(sr.first) != string::npos)
            total += sr.second;
    return total;
}

bool isValid(int x, int y, const vector<vector<bool>> &visited)
{
    return x >= 0 && x < n && y >= 0 && y < u && !visited[x][y];
}

void findPaths(int x, int y, vector<int> &path, vector<vector<bool>> &visited, bool horizontal)
{
    visited[x][y] = true;
    path.push_back(x * u + y);

    if ((int)path.size() == m)
    {
        int r = calculateReward(path);
        if (r > maxReward || maxRewardPath.empty())
        {
            maxReward = r;
            maxRewardPath = path;
        }
    }
    else if (!horizontal)
    {
        for (int i = 0; i < n; ++i)
            if (i != x && isValid(i, y, visited))
                findPaths(i, y, path, visited, true);
    }
    else
    {
        for (int j = 0; j < u; ++j)
            if (j != y && isValid(x, j, visited))
                findPaths(x, j, path, visited, false);
    }

    visited[x][y] = false;
    path.pop_back();
}

void printPath(const vector<int> &path)
{
    cout << "\n=== RESULT ===\n";
    cout << "Reward: " << calculateReward(path) << "\n";
    cout << "Path  : ";
    for (int idx : path) cout << matrix[idx / u][idx % u] << " ";
    cout << "\nCoords:\n";
    for (int idx : path)
        cout << "  " << (idx % u) + 1 << ", " << (idx / u) + 1 << "\n";
}

void saveSolution(const vector<int> &path, long long execMs)
{
    string name;
    cout << ">> Save as filename (without .txt, will be written to test/): ";
    cin >> name;
    string fp = "../test/" + name + ".txt";
    ofstream f(fp);
    if (!f.is_open())
    {
        cerr << "!! Could not write " << fp << "\n";
        return;
    }
    f << calculateReward(path) << "\n";
    for (int idx : path) f << matrix[idx / u][idx % u] << " ";
    f << "\n";
    for (int idx : path)
        f << (idx % u) + 1 << ", " << (idx / u) + 1 << "\n";
    f << execMs << " ms\n";
    f.close();
    cout << ">> Saved to " << fp << "\n";
}

int main()
{
    using namespace std::chrono;

    cout << "\n=== CYBERPUNK 2077 BREACH PROTOCOL ===\n"
         << "Tugas Kecil 1 IF2211 Strategi Algoritma | 13522140, Yasmin Farisah Salma\n\n";

    int choice = 0;
    while (true)
    {
        cout << "Input mode:\n"
             << "  1. Manual\n"
             << "  2. Randomized\n"
             << "  3. File (from inputs/)\n"
             << "  4. Exit\n"
             << ">> Choice: ";
        if (!(cin >> choice))
        {
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            cout << "!! Enter 1-4.\n\n";
            continue;
        }
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        if (choice >= 1 && choice <= 4) break;
        cout << "!! Enter 1-4.\n\n";
    }

    switch (choice)
    {
    case 1: manualInput(); break;
    case 2: randomizedInput(); break;
    case 3: fileInput(); break;
    case 4: cout << ">> Bye.\n"; return 0;
    }

    auto start = high_resolution_clock::now();
    vector<vector<bool>> visited(n, vector<bool>(u, false));
    for (int i = 0; i < u; ++i)
    {
        vector<int> path;
        findPaths(0, i, path, visited, false);
    }
    auto stop = high_resolution_clock::now();
    auto durMs = duration_cast<milliseconds>(stop - start).count();

    if (maxRewardPath.empty())
    {
        cout << "\n>> No paths found.\n";
        return 0;
    }
    printPath(maxRewardPath);
    cout << "Time  : " << durMs << " ms\n";

    cout << "\n>> Save solution? (y/n): ";
    char ans;
    cin >> ans;
    if (ans == 'y' || ans == 'Y')
        saveSolution(maxRewardPath, durMs);
    else
        cout << ">> Not saved.\n";

    return 0;
}
