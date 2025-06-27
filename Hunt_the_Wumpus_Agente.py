# ---------------------------------------------------------------
#    HUNT THE WUMPUS - Eduardo Pivaral Leal
#    ------------------------------------------------
#         ===== Project Description =====
#  
# * 20x20 board, where the player can move up, right, down, left,
#   except at the edges (only 3 possible moves),
#   or in the corners (only 2 possible moves)
#
# * The Agent can win in 2 ways:
#       - Finding the gold
#       - Killing the Wumpus
# 
# * Information about the items (all placed randomly):
#   
#   - GOLD (x1): Finding it WINS the game. No notification in adjacent rooms.
#
#   - WUMPUS (x1): If you find it, you lose. In adjacent rooms, you get the message "You smell something terrible".
#                   If adjacent, you can shoot; if you hit, you WIN, if you miss, you must continue exploring.
#                   If you have no shots left, you must continue exploring.
#
#   - Pit (x4): If you find it, you fall and LOSE. In adjacent rooms, you get the message "You feel a breeze".
#               If adjacent, you return and explore another path.
#    
#   - Bat (x8): If you find it, it teleports you to a random location in the cave.
#               In adjacent rooms, you get the message "You hear flapping".
#               The first time you visit an adjacent room, you continue exploring (risking teleportation).
#               On subsequent visits, you avoid that room.
#               If a bat teleports you, your exploration history is erased, but known threats are kept.
#  
# * The Agent starts with no information and in a random location.
#    
# * The cave is explored using a Depth First Search algorithm. When adjacent to a threat, the agent backtracks.
# 
# * The Agent keeps the following information, updated as it explores:
#   - Explored nodes
#   - Stack of previous nodes for DFS (to know how to backtrack)
#   - Dangerous adjacent nodes (to avoid in the future)
# 
# * If the DFS tree is empty (at the initial node), the agent moves to the next available cell, risking a threat.
#  
# * The agent has 2 shots to kill the Wumpus if adjacent. The shot is random and can hit or miss.
#   What happens in each case is discussed in the Wumpus section.
#
# * There is a very high probability (>90% over 2,200+ simulated games) of winning, since DFS is a complete algorithm.
#   The agent only loses in these cases:
#   - The initial node is adjacent to a threat and, with no danger history, must continue and may lose.
#   - After being teleported by a bat, the search tree is reset (similar to above).
#   - When exploration is advanced and few nodes remain, the agent may be forced to risk a dangerous node.
#
# * At the start, the locations of threats and gold are shown to the spectator (blue background), ignored by the Agent.
# * During the game, the current cell, next cells, and any dangers are shown.
# * The agent's decision for each cell is displayed.
# * At the end, game statistics are shown, and the option to repeat is given.
# ---------------------------------------------------------------
import colorama
from colorama import Fore
import random

# Constants for cave and threats
CAVE_SIZE = 20
TOTAL_ROOMS = CAVE_SIZE * CAVE_SIZE
NUM_BATS = 8
NUM_PITS = 4
NUM_WUMPUS = 1
NUM_GOLD = 1


def generate_cave():
    """Generate a 20x20 cave as a dictionary where each key is a room number and the value is a list of adjacent rooms."""
    cave = {}
    for room in range(1, TOTAL_ROOMS + 1):
        neighbors = []
        # Up
        if room - CAVE_SIZE > 0:
            neighbors.append(room - CAVE_SIZE)
        # Right
        if room % CAVE_SIZE != 0:
            neighbors.append(room + 1)
        # Down
        if room + CAVE_SIZE <= TOTAL_ROOMS:
            neighbors.append(room + CAVE_SIZE)
        # Left
        if (room - 1) % CAVE_SIZE != 0:
            neighbors.append(room - 1)
        cave[room] = neighbors
    return cave

# Generate the cave structure
cave = generate_cave()


class GameStats:
    """Tracks the number of games and victories, and calculates win percentage."""
    def __init__(self):
        self.games = 0
        self.victories = 0

    def win_percentage(self):
        if self.games == 0:
            return 0.0
        return (self.victories / self.games) * 100

# -----------------------------------------------
#                Agent Class
# -----------------------------------------------

class Agent:
    """Implements the agent's logic for exploring the cave using DFS and avoiding dangers."""
    def __init__(self):
        self.explored_nodes = []
        self.danger_nodes = {}  # Dangerous nodes to avoid
        self.position = -1  # Current agent position
        self.previous_positions = []  # Stack for DFS backtracking
        self.bat_resets = 0  # Times teleported by bats
        self.total_exploration = 0
        self.shots_left = 2

    def visit_node(self, possible_moves, danger_level):
        # DFS logic for agent movement
        if danger_level > 0:
            self.danger_nodes[self.position] = danger_level
            if danger_level >= 50:
                # Possible Wumpus
                if self.shots_left > 0:
                    print(Fore.YELLOW + f"Trying a shot, shots left: {self.shots_left}")
                    shot = random.choice(possible_moves)
                    self.shots_left -= 1
                    print(Fore.MAGENTA + f"Shot at room: {shot}")
                    if WG.threats.get(shot) == 'wumpus':
                        print(Fore.GREEN + "You killed the Wumpus!", end=' ')
                        print(Fore.WHITE)
                        return 1000
                    else:
                        print(Fore.YELLOW + "Missed the shot! >>> ", end=' ')
                        if self.previous_positions:
                            print(Fore.YELLOW + "Wumpus survived! - Going back and trying another route", end=' ')
                            print(Fore.WHITE)
                            return self.previous_positions.pop()
                else:
                    print(Fore.YELLOW + "No more shots... Exploring another route", end=' ')
                    print(Fore.WHITE)
                    if self.previous_positions:
                        return self.previous_positions.pop()
            elif danger_level > 10:
                if self.previous_positions:
                    print(Fore.YELLOW + "Dangerous room, going back and trying another tunnel", end=' ')
                    print(Fore.WHITE)
                    return self.previous_positions.pop()
            elif danger_level == 10:
                print(Fore.MAGENTA + "Not afraid of bats, will continue, but avoid in the future", end=' ')
                print(Fore.WHITE)

        found = False
        moves = possible_moves[:]
        random.shuffle(moves)
        for node in moves:
            if node not in self.explored_nodes and node not in self.danger_nodes:
                self.explored_nodes.append(node)
                found = True
                self.previous_positions.append(self.position)
                break
        if not found:
            print(Fore.LIGHTYELLOW_EX + "All options explored, only danger ahead: Backtracking and trying another path", end=' ')
            print(Fore.WHITE)
            if self.previous_positions:
                return self.previous_positions.pop()
            else:
                return random.choice(moves)
        return node


#---------------------------------------------------------------------------------
#             Clase del juego de Wumpus
# Codigo original tomado de: https://rosettacode.org/wiki/Hunt_the_Wumpus#Python
# Varias modificaciones fueron hechas al codigo original para este proyecto
#  - Cueva 20X20
#  - 
#---------------------------------------------------------------------------------    
 
class WumpusGame:
    """Manages the cave, threats, gold placement, and the main game loop."""
    def __init__(self):
        self.cave = cave
        self.threats = {}
        self.gold = -1  # Gold position
        self.player_pos = -1

    def get_safe_rooms(self):
        return list(set(self.cave.keys()).difference(self.threats.keys()))

    def populate_cave(self):
        # Place threats and gold randomly
        threats_list = (
            ['bat'] * NUM_BATS +
            ['pit'] * NUM_PITS +
            ['wumpus'] * NUM_WUMPUS
        )
        for threat in threats_list:
            pos = random.choice(self.get_safe_rooms())
            self.threats[pos] = threat
        self.player_pos = random.choice(self.get_safe_rooms())
        self.gold = random.choice(self.get_safe_rooms())

    def enter_room(self, room_number):
        print(f"Entering room >>> {room_number} -- ", end=' ')
        if self.threats.get(room_number) == 'bat':
            print(Fore.RED + ">>>> Found a bat! Teleporting to a random room, exploration history reset but known dangers kept.")
            print(Fore.WHITE)
            new_pos = random.choice(self.get_safe_rooms())
            result_bat = self.enter_room(new_pos)
            AgentWG.bat_resets += 1
            AgentWG.total_exploration += len(AgentWG.explored_nodes)
            AgentWG.previous_positions = []
            AgentWG.explored_nodes = []
            AgentWG.position = new_pos
            return new_pos, result_bat[1]
        elif self.threats.get(room_number) == 'wumpus':
            print(Fore.RED + "The Wumpus ate you!")
            return -1, 0
        elif self.threats.get(room_number) == 'pit':
            print(Fore.RED + "You fell into a pit!")
            return -1, 0
        elif room_number == self.gold:
            print(Fore.GREEN + "You found the gold!")
            return 1000, 0
        # Calculate danger score for adjacent rooms
        danger_score = 0
        for i in self.cave[room_number]:
            threat = self.threats.get(i)
            if threat == 'bat':
                print(Fore.RED + "!!!! DANGER !!!! >>>> You hear flapping ", end=' ')
                danger_score += 10
            elif threat == 'pit':
                print(Fore.RED + "!!!! DANGER !!!! >>>> You feel a breeze ", end=' ')
                danger_score += 20
            elif threat == 'wumpus':
                danger_score += 50
                print(Fore.RED + "!!!! DANGER !!!! >>>> You smell something terrible ", end=' ')
        if danger_score > 0:
            print(Fore.WHITE, end=' ')
        return room_number, danger_score

    def gameloop(self):
        self.populate_cave()
        print()
        print(colorama.Back.BLUE)
        print(Fore.LIGHTWHITE_EX + "===============")
        print("HUNT THE WUMPUS")
        print()
        print(f"DEBUG: Threat locations: {self.threats}")
        print()
        print(f"DEBUG: Gold is at: {self.gold}")
        print("===============")
        print()
        print(colorama.Style.RESET_ALL)
        result = self.enter_room(self.player_pos)
        AgentWG.position = self.player_pos
        AgentWG.explored_nodes.append(self.player_pos)
        while True:
            print("Next tunnels: ", end=' ')
            print(self.cave[self.player_pos])
            move = AgentWG.visit_node(self.cave[self.player_pos], result[1])
            if move != 1000:
                print("---")
                result = self.enter_room(move)
                self.player_pos = result[0]
                AgentWG.position = self.player_pos
            else:
                self.player_pos = move
            if self.player_pos == 1000:
                EstadisticaWG.victories += 1
                print(' ')
                print(Fore.GREEN + "!!!!!!!!    YOU WON    !!!!!!!!")
            elif self.player_pos == -1:
                print(' ')
                print(Fore.RED + "You lost! :( ")
            if self.player_pos == 1000 or self.player_pos == -1:
                print(' ')
                print(Fore.LIGHTBLUE_EX + "*** Agent Statistics ***")
                print('------------')
                print("Total games: ", end=' ')
                print(EstadisticaWG.games)
                print("Victories: ", end=' ')
                print(EstadisticaWG.victories)
                print("Success rate: ", end=' ')
                print(f"{EstadisticaWG.win_percentage():.2f}%")
                print('------------')
                print("Nodes explored (last run): ", end=' ')
                print(len(AgentWG.explored_nodes))
                print()
                print("Nodes explored (total): ", end=' ')
                print(AgentWG.total_exploration + len(AgentWG.explored_nodes))
                print()
                print("Shots left: ", end=' ')
                print(AgentWG.shots_left)
                print()
                print(Fore.LIGHTRED_EX + "Times search reset (by bats): ", end=' ')
                print(AgentWG.bat_resets)
                print()
                print(Fore.LIGHTYELLOW_EX + "Nodes marked as dangerous: ", end=' ')
                print(AgentWG.danger_nodes)
                print()
                print(Fore.LIGHTBLUE_EX + "DFS stack: ", end=' ')
                print(len(AgentWG.previous_positions))
                print(AgentWG.previous_positions)
                print(Fore.WHITE)
                break
 
        
#-----------------------------------------------------------
#                    Ciclo main
#-----------------------------------------------------------
 
if __name__ == '__main__':
    # Main game loop
    play_again = True
    EstadisticaWG = GameStats()

    while play_again:
        EstadisticaWG.games += 1
        global AgentWG
        AgentWG = Agent()
        WG = WumpusGame()
        WG.gameloop()

        while True:
            print()
            print("-------------------------------------")
            inpt = input(colorama.Back.LIGHTWHITE_EX + Fore.BLACK + ">>> Play again? Y/N >>> ")
            option = str(inpt).lower()
            if option in ['y', 'n']:
                break
            else:
                print("Only Y or N allowed")

        if option == 'n':
            play_again = False
            break